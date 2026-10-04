import {
  type AssistantMessage,
  type AssistantTransport,
  type AssistantTransportReply,
  createAgentSession,
} from "@adapttable/ai";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  createFeatureState,
  provideFeatureState,
} from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { isProxy, isReadonly } from "vue";

import {
  type TableAssistantOptions,
  useTableAssistant,
} from "../src/assistant";
import { mountComposable, newSession } from "./composables.test-utils";
const transport: AssistantTransport = {
  send: () => Promise.resolve({ text: "Done" }),
};
const setup = (patch: Partial<TableAssistantOptions> = {}) =>
  mountComposable<TableAssistantOptions, ReturnType<typeof useTableAssistant>>(
    { session: newSession(), transport, ...patch },
    useTableAssistant
  );
function deferredTransport() {
  let settle: (reply: AssistantTransportReply) => void = (_reply) => undefined;
  let signal: AbortSignal | undefined;
  const send = vi.fn((input: Parameters<AssistantTransport["send"]>[0]) => {
    signal = input.signal;
    return new Promise<AssistantTransportReply>((resolve) => {
      settle = resolve;
    });
  });
  return {
    transport: { send },
    send,
    settle: (reply: AssistantTransportReply) => settle(reply),
    aborted: () => signal?.aborted,
  };
}
describe("useTableAssistant", () => {
  it("keeps missing transport disconnected and exposes readonly refs", async () => {
    const { result } = setup({ transport: undefined });
    expect(result.status.value).toBe("disconnected");
    expect(isReadonly(result.status)).toBe(true);
    result.setDraft("hello");
    await result.send();
    expect(result.messages.value).toEqual([]);
    expect(result.draft.value).toBe("hello");
  });
  it("shares the neutral transcript without deep proxies and methods stay stable", async () => {
    const host = setup();
    const send = host.result.send;
    host.result.setDraft("hello");
    await host.result.send();
    expect(host.result.messages.value.map((message) => message.text)).toEqual([
      "hello",
      "Done",
    ]);
    expect(isProxy(host.result.messages.value)).toBe(false);
    host.input.value = { ...host.input.value, open: true };
    expect(host.result.send).toBe(send);
  });
  it("honors controlled open and latest callback without optimistic changes", () => {
    const before = vi.fn();
    const after = vi.fn();
    const host = setup({ open: false, onOpenChange: before });
    host.result.setOpen(true);
    expect(before).toHaveBeenCalledExactlyOnceWith(true);
    expect(host.result.open.value).toBe(false);
    host.input.value = { ...host.input.value, onOpenChange: after };
    host.result.setOpen(true);
    expect(after).toHaveBeenCalledExactlyOnceWith(true);
    host.input.value = { ...host.input.value, open: true };
    expect(host.result.open.value).toBe(true);
  });
  it("lets uncontrolled open state survive option replacement", () => {
    const host = setup();
    host.result.setOpen(true);
    host.input.value = { ...host.input.value, conversation: 0 };
    expect(host.result.open.value).toBe(true);
  });
  it("reads replacement controlled transcript and latest message callback", async () => {
    const before = vi.fn();
    const after = vi.fn();
    const messages: readonly AssistantMessage[] = [
      { id: "saved", role: "assistant", text: "Saved", at: 1 },
    ];
    const host = setup({ messages, onMessagesChange: before });
    expect(host.result.messages.value).toBe(messages);
    host.input.value = { ...host.input.value, onMessagesChange: after };
    await host.result.send("next");
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalled();
    const replacement: readonly AssistantMessage[] = [
      { id: "socket", role: "assistant", text: "Socket", at: 2 },
    ];
    host.input.value = { ...host.input.value, messages: replacement };
    expect(host.result.messages.value).toBe(replacement);
  });
  it("cancels queued sends when stopped or cleared before Vue flush", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "late" }));
    const host = setup({ transport: { send } });
    const pending = host.result.send("cancel");
    host.result.stop();
    await pending;
    expect(send).not.toHaveBeenCalled();
    const second = host.result.send("cancel");
    host.result.clear();
    await second;
    expect(send).not.toHaveBeenCalled();
  });
  it("drops late turns after session replacement", async () => {
    const pending = deferredTransport();
    const host = setup({ transport: pending.transport });
    const turn = host.result.send("old");
    await vi.waitFor(() => expect(pending.send).toHaveBeenCalledOnce());
    expect(host.result.busy.value).toBe(true);
    host.input.value = {
      ...host.input.value,
      session: newSession("replacement"),
    };
    expect(pending.aborted()).toBe(true);
    pending.settle({ text: "old reply" });
    await turn;
    expect(host.result.messages.value).toEqual([]);
  });
  it("uses latest transport object without resetting a conversation", async () => {
    const host = setup();
    await host.result.send("one");
    host.input.value = {
      ...host.input.value,
      transport: { send: () => Promise.resolve({ text: "Fresh" }) },
    };
    await host.result.send("two");
    expect(host.result.messages.value.map((message) => message.text)).toEqual([
      "one",
      "Done",
      "two",
      "Fresh",
    ]);
  });
  it("stops a turn and ignores late transport completion", async () => {
    const pending = deferredTransport();
    const host = setup({ transport: pending.transport });
    const turn = host.result.send("stop");
    await vi.waitFor(() => expect(pending.send).toHaveBeenCalledOnce());
    host.result.stop();
    expect(pending.aborted()).toBe(true);
    pending.settle({ text: "Late" });
    await turn;
    expect(host.result.interrupted.value).toBe("stopped");
    expect(host.result.messages.value.map((message) => message.text)).toEqual([
      "stop",
    ]);
  });
  it("suspends on KeepAlive deactivation and reconnects with latest inputs", async () => {
    const pending = deferredTransport();
    const host = setup({ transport: pending.transport });
    const turn = host.result.send("old");
    await vi.waitFor(() => expect(pending.send).toHaveBeenCalledOnce());
    await host.deactivate();
    expect(pending.aborted()).toBe(true);
    host.input.value = { ...host.input.value, transport };
    await host.result.send("inactive");
    expect(pending.send).toHaveBeenCalledOnce();
    pending.settle({ text: "Late" });
    await turn;
    await host.activate();
    await host.result.send("active");
    expect(host.result.messages.value.at(-1)?.text).toBe("Done");
  });
  it("disposes in-flight work and cannot send after unmount", async () => {
    const pending = deferredTransport();
    const host = setup({ transport: pending.transport });
    const turn = host.result.send("hello");
    await vi.waitFor(() => expect(pending.send).toHaveBeenCalledOnce());
    host.dispose();
    expect(pending.aborted()).toBe(true);
    pending.settle({ text: "Late" });
    await turn;
    await host.result.send("after");
    expect(pending.send).toHaveBeenCalledOnce();
  });
  it("detaches named work on deactivation and explicitly resumes it after reconnect", async () => {
    const before = vi.fn();
    const after = vi.fn();
    const resume = vi.fn(() => Promise.resolve({ text: "Rejoined" }));
    const host = setup({
      onDetach: before,
      transport: {
        send: ({ onResumable }) => {
          onResumable?.("job-1");
          return new Promise(() => undefined);
        },
        resume,
      },
    });
    void host.result.send("long work");
    await vi.waitFor(() => expect(host.result.busy.value).toBe(true));
    host.input.value = { ...host.input.value, onDetach: after };
    await host.deactivate();
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ text: "long work", token: "job-1" })
    );
    await host.activate();
    expect(host.result.interrupted.value).toBe("detached");
    expect(host.result.resumable.value?.token).toBe("job-1");
    expect(resume).not.toHaveBeenCalled();
    await host.result.resume();
    expect(resume).toHaveBeenCalledOnce();
    expect(host.result.messages.value.at(-1)?.text).toBe("Rejoined");
  });
  it("forwards conversation policy, clips, suggestions, questions and allowance revocation", async () => {
    const revoke = vi.fn();
    const sends: Parameters<AssistantTransport["send"]>[0][] = [];
    const host = setup({
      conversation: 0,
      alwaysAllow: { capabilities: ["test.run"], revoke },
      suggestions: [{ id: "summary", title: "Summary", prompt: "Summarize" }],
      transport: {
        send: (input) => {
          sends.push(input);
          return Promise.resolve({
            text: "Done",
            ...(input.audio ? { transcript: "Heard" } : {}),
          });
        },
      },
    });
    await host.result.runSuggestion("summary");
    expect(sends[0]?.text).toBe("Summarize");
    await host.result.sendClip({
      mimeType: "audio/webm",
      base64: "YWJj",
      durationMs: 10,
    });
    expect(sends[1]?.audio?.base64).toBe("YWJj");
    expect(host.result.messages.value.at(-2)?.text).toBe("Heard");
    expect(host.result.alwaysAllowed.value[0]?.capability).toBe("test.run");
    host.result.revokeAlwaysAllow("test.run");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("test.run");
  });
});

describe("assistant feature-state integration", () => {
  it("projects approval, progress, table context and injected allowances", async () => {
    const state = createFeatureState();
    const read = vi.fn(() => ({ view: { page: 1 } }));
    const revoke = vi.fn();
    const approval = {
      proposals: [],
      decisions: [],
      presentation: "widget" as const,
      approve: vi.fn(),
      reject: vi.fn(),
    };
    state.set(AGENT_APPROVAL_STATE, approval);
    state.set(AGENT_PROGRESS_STATE, {
      capability: "test.work",
      idempotencyKey: "work",
      done: 2,
      total: 4,
    });
    state.set(AGENT_VIEW_STATE, { read });
    state.set(AGENT_ALWAYS_ALLOW_STATE, {
      capabilities: ["test.work"],
      revoke,
    });
    const pending = deferredTransport();
    const host = mountComposable<
      TableAssistantOptions,
      ReturnType<typeof useTableAssistant>
    >(
      { session: newSession(), transport: pending.transport },
      useTableAssistant,
      () => provideFeatureState(state)
    );
    expect(host.result.approval.value).toBe(approval);
    const turn = host.result.send("read table context");
    await vi.waitFor(() => expect(pending.send).toHaveBeenCalledOnce());
    expect(host.result.progress.value?.done).toBe(2);
    expect(host.result.alwaysAllowed.value[0]?.capability).toBe("test.work");
    pending.settle({ text: "Read" });
    await turn;
    expect(read).toHaveBeenCalled();
    host.result.revokeAlwaysAllow("test.work");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("test.work");
    state.set(AGENT_APPROVAL_STATE, null);
    state.set(AGENT_PROGRESS_STATE, null);
    state.set(AGENT_VIEW_STATE, null);
    expect(host.result.approval.value).toBeNull();
    expect(host.result.progress.value).toBeNull();
    expect(host.result.undo.value).toBeNull();
    await host.result.undoTurn();
    await host.result.undoAction("absent");
  });
  it("surfaces questions and lets the host answer through the stable action", async () => {
    const answered = vi.fn();
    const host = setup({
      transport: {
        send: async ({ askUser }) => {
          const answer = await askUser?.({
            id: "choice",
            question: "Choose a scope",
            allowFreeText: false,
            options: [{ id: "all", label: "All rows" }],
          });
          answered(answer);
          return { text: "Answered" };
        },
      },
    });
    const turn = host.result.send("choose");
    await vi.waitFor(() =>
      expect(host.result.status.value).toBe("awaiting-user")
    );
    expect(host.result.messages.value.at(-1)?.question?.id).toBe("choice");
    host.result.answer({ optionId: "all" });
    await turn;
    expect(answered).toHaveBeenCalledExactlyOnceWith({ optionId: "all" });
    expect(host.result.messages.value.at(-1)?.text).toBe("Answered");
  });
  it("builds real undo offers and exposes blocked state after a foreign change", async () => {
    let page = 1;
    let revision = 1;
    const session = createAgentSession({
      observe: () => ({
        tableId: "pages",
        viewRevision: revision,
        featureIds: [],
        columns: [
          {
            id: "name",
            label: "Name",
            type: "string",
            readable: true,
            writable: false,
            sortable: false,
          },
        ],
        source: {
          fullDataset: false,
          grouping: false,
          selectAcrossPages: false,
          exportScope: "page",
          totalCount: "loaded",
        },
        writePolicy: "deny",
        hasPagination: true,
        hasSearch: false,
        hasSort: false,
        hasFilters: false,
        hasExport: false,
        hasEdit: false,
        hasReorder: false,
        page,
        limit: 10,
        search: "",
        pageMax: 10,
        rowAddressScope: "visible",
      }),
      apply: {
        setPage: (next) => {
          page = next;
          revision += 1;
        },
      },
    });
    let calls = 0;
    const host = setup({
      session,
      contextInputs: () => ({ view: { page, limit: 10 } }),
      transport: {
        send: async () => {
          calls += 1;
          const result = await session.execute(
            "view.setPage",
            { page: 2 },
            session.manifest().viewRevision,
            `page-${calls}`
          );
          return { text: "Paged", results: [result], keys: ["view.setPage"] };
        },
      },
    });
    await host.result.send("page two");
    expect(host.result.undo.value?.available).toBe(true);
    await host.result.undoAction("page-1");
    expect(page).toBe(1);
    await host.result.send("page two again");
    expect(host.result.undo.value?.available).toBe(true);
    page = 3;
    revision += 1;
    host.input.value = { ...host.input.value, awaitingApproval: false };
    expect(host.result.undo.value?.available).toBe(false);
    expect(host.result.undo.value?.blockedCode).toBeDefined();
    await host.result.undoTurn();
    expect(page).toBe(3);
  });
  it("cancels queued work when the transport key changes and keeps failed drafts", async () => {
    const send = vi.fn(() => Promise.reject(new Error("Offline")));
    const host = setup({ transport: { send }, transportKey: "one" });
    const queued = host.result.send("stale");
    host.input.value = { ...host.input.value, transportKey: "two" };
    await queued;
    expect(send).not.toHaveBeenCalled();
    host.result.setDraft("keep this draft");
    await host.result.send();
    expect(host.result.error.value).toBe("Offline");
    expect(host.result.draft.value).toBe("keep this draft");
  });
});
