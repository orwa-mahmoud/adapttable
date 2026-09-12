import { describe, expect, it, vi } from "vitest";

import type {
  AssistantTransport,
  AssistantTransportReply,
} from "./assistantContracts";
import { createTableAssistant } from "./assistantStore";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: [],
    columns: [],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function tableSession(patch: Partial<AgentObservation> = {}): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: { setPage: vi.fn() },
  });
}

/** A transport whose reply the test settles by hand. */
function deferredTransport() {
  let settle: ((reply: AssistantTransportReply) => void) | undefined;
  let fail: ((cause: unknown) => void) | undefined;
  const transport: AssistantTransport = {
    send: () =>
      new Promise<AssistantTransportReply>((resolve, reject) => {
        settle = resolve;
        fail = reject;
      }),
  };
  return {
    transport,
    reply: (text: string) => settle?.({ text }),
    throw: (cause: unknown) => fail?.(cause),
  };
}

function replying(text = "ok"): AssistantTransport {
  return { send: () => Promise.resolve({ text }) };
}

describe("the assistant store", () => {
  it("is inert until it is connected", () => {
    const connect = vi.fn();
    const store = createTableAssistant({
      session: tableSession(),
      transport: { connect, send: () => Promise.resolve({ text: "" }) },
    });

    // Constructing must not open a connection: a render can be thrown away.
    expect(connect).not.toHaveBeenCalled();
    expect(store.getState().status).toBe("idle");
    store.connect();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("hands back the same snapshot until something moves", () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });

    const first = store.getState();
    expect(store.getState()).toBe(first);
    store.setDraft("hello");
    expect(store.getState()).not.toBe(first);
    expect(store.getState().draft).toBe("hello");
  });

  it("does not notify when an update changes nothing", () => {
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({ session, transport });
    const listener = vi.fn();
    store.subscribe(listener);

    // A binding handing over its live inputs on every render must be free.
    store.update({ session, transport });
    store.update({ session, transport });
    expect(listener).not.toHaveBeenCalled();
  });

  it("records the turn and the reply in order", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying("Moved to page 2."),
    });
    store.connect();
    await store.send("Page 2");

    const state = store.getState();
    expect(state.messages.map((entry) => entry.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(state.messages[1]?.text).toBe("Moved to page 2.");
    expect(state.status).toBe("ready");
    expect(state.busy).toBe(false);
  });

  it("refuses a second send while one is in flight", async () => {
    const deferred = deferredTransport();
    const send = vi.spyOn(deferred.transport, "send");
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();

    const first = store.send("one");
    const second = store.send("two");
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.getState().canSend).toBe(false);
    deferred.reply("done");
    await Promise.all([first, second]);
  });

  it("clears the draft on send and puts it back when the turn fails", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    store.setDraft("find everything");

    const turn = store.send();
    expect(store.getState().draft).toBe("");
    deferred.throw(new Error("backend is down"));
    await turn;

    // Retyping is worse than the outage.
    expect(store.getState().draft).toBe("find everything");
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("backend is down");
  });

  it("keeps what the reader typed instead of the failed draft", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    store.setDraft("first");
    const turn = store.send();
    store.setDraft("second");
    deferred.throw(new Error("nope"));
    await turn;

    expect(store.getState().draft).toBe("second");
  });

  it("releases the composer on stop even when a transport ignores its signal", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.stop();
    expect(store.getState().busy).toBe(false);
    expect(store.getState().status).toBe("ready");

    // The transport answers anyway. The reply belongs to a turn that is over.
    deferred.reply("late");
    await turn;
    expect(store.getState().messages).toHaveLength(1);
  });

  it("does not report a stop as a failure", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");
    store.stop();
    deferred.throw(new Error("aborted"));
    await turn;

    expect(store.getState().error).toBeUndefined();
  });

  it("drops a reply that belongs to a table the reader has left", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.update({ session: tableSession(), transport: deferred.transport });
    deferred.reply("for the old table");
    await turn;

    // A new session is a new conversation.
    expect(store.getState().messages).toEqual([]);
  });

  it("leaves the transcript alone for an ordinary input change", async () => {
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({ session, transport });
    store.connect();
    await store.send("one");

    store.update({ session, transport, awaitingApproval: true });
    expect(store.getState().messages).toHaveLength(2);
  });

  it("reconnects when the transport key changes", () => {
    const session = tableSession();
    const first = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: replying().send,
    };
    const second = { connect: vi.fn(), send: replying().send };
    const store = createTableAssistant({
      session,
      transport: first,
      transportKey: "a",
    });
    store.connect();
    expect(first.connect).toHaveBeenCalledTimes(1);

    store.update({ session, transport: second, transportKey: "b" });
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second.connect).toHaveBeenCalledTimes(1);
  });

  it("cancels an active turn before clearing", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.clear();
    expect(store.getState().messages).toEqual([]);
    expect(store.getState().busy).toBe(false);
    deferred.reply("late");
    await turn;
    expect(store.getState().messages).toEqual([]);
  });

  it("reads the catalog when a suggestion is clicked, not when it was drawn", async () => {
    let hasPagination = true;
    const session = createAgentSession({
      observe: () => observation({ hasPagination }),
      apply: { setPage: vi.fn() },
    });
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session,
      transport: { send },
      suggestions: [
        {
          id: "page",
          title: "Next page",
          prompt: "Go to page 2",
          requires: ["view.setPage"],
        },
      ],
    });
    store.connect();
    expect(store.getState().suggestions).toHaveLength(1);

    // The capability goes away between the chip being drawn and clicked.
    hasPagination = false;
    await store.runSuggestion("page");
    expect(send).not.toHaveBeenCalled();
  });

  it("splits the suggestions a table can run into primary and more", () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
      primarySuggestions: 1,
      suggestions: [
        { id: "a", title: "A", prompt: "a" },
        { id: "b", title: "B", prompt: "b" },
      ],
    });

    expect(store.getState().suggestions.map((s) => s.id)).toEqual(["a"]);
    expect(store.getState().moreSuggestions.map((s) => s.id)).toEqual(["b"]);
  });

  it("says nothing more after dispose", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const listener = vi.fn();
    store.subscribe(listener);
    const turn = store.send("one");

    store.dispose();
    listener.mockClear();
    deferred.reply("late");
    await turn;

    expect(listener).not.toHaveBeenCalled();
    // Idempotent: a second dispose is not an error.
    expect(() => {
      store.dispose();
    }).not.toThrow();
  });

  it("cannot be made to send after dispose", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session: tableSession(),
      transport: { send },
    });
    store.connect();
    store.dispose();
    await store.send("one");

    expect(send).not.toHaveBeenCalled();
  });

  it("reports a missing transport rather than pretending to connect", async () => {
    const store = createTableAssistant({ session: tableSession() });
    store.connect();
    expect(store.getState().status).toBe("disconnected");

    await store.send("one");
    expect(store.getState().error).toBe("no transport is connected");
  });

  it("surfaces why a turn stopped short beside what it did", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "Working on it.",
            unresolved: {
              code: "discovery-exhausted",
              message: "the backend never settled on a plan",
              pending: ["view.setPage"],
            },
          }),
      },
    });
    store.connect();
    await store.send("one");

    expect(store.getState().error).toBe("the backend never settled on a plan");
    expect(store.getState().messages).toHaveLength(2);
  });
});
