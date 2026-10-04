import type { AgentSession, AssistantTransportReply } from "@adapttable/ai";
import type {
  AgentApprovalPending,
  AgentProgress,
} from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import {
  type TableAssistantOptions,
  type TableAssistantState,
  useTableAssistant,
} from "../src/assistant";
import { mountComposable, newSession } from "./composables.test-utils";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
describe("assistant presentation bridge", () => {
  it("uses external approval and progress in the plain view and exposes actual waiting state", async () => {
    const approval: AgentApprovalPending = {
      presentation: "widget",
      proposals: [],
      decisions: [],
      approve: vi.fn(),
      reject: vi.fn(),
    };
    const progress: AgentProgress = {
      capability: "test",
      idempotencyKey: "one",
      done: 2,
      total: 4,
    };
    let finish: ((value: AssistantTransportReply) => void) | undefined;
    const send = vi.fn(
      () =>
        new Promise<AssistantTransportReply>((resolve) => {
          finish = resolve;
        })
    );
    const host = mountComposable<TableAssistantOptions, TableAssistantState>(
      { session: newSession(), transport: { send }, approval, progress },
      useTableAssistant
    );
    const turn = host.result.send("work");
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(host.result.status.value).toBe("awaiting-approval");
    expect(host.result.view.value.busy).toBe(true);
    expect(host.result.view.value.progress?.done).toBe(2);
    expect(host.result.approval.value).toBe(approval);
    expect(host.result.view.value.send).toBe(host.result.send);
    host.input.value = { ...host.input.value, approval: null, progress: null };
    expect(host.result.status.value).toBe("sending");
    expect(host.result.view.value.progress).toBeNull();
    finish?.({ text: "done" });
    await turn;
    expect(host.result.view.value.messages.at(-1)?.text).toBe("done");
    host.result.setDraft("changed");
    expect(host.result.view.value.draft).toBe("changed");
  });
  it("drops actions when a parent queues replacement props later in the same event", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "unexpected" }));
    const session = shallowRef(newSession());
    let state: TableAssistantState | undefined;
    const Child = defineComponent(
      (props: { session: AgentSession }) => {
        state = useTableAssistant(() => ({
          session: props.session,
          transport: { send },
        }));
        return () => h("span");
      },
      { props: ["session"] }
    );
    const app = createApp({
      setup: () => () => h(Child, { session: session.value }),
    });
    app.mount(document.createElement("div"));
    stops.push(() => app.unmount());
    if (!state) throw new Error("missing assistant");
    const work = state.send("stale");
    session.value = newSession("replacement");
    await work;
    expect(send).not.toHaveBeenCalled();
    const after = state.send("also stale");
    state.clear();
    await after;
    expect(send).not.toHaveBeenCalled();
    await nextTick();
    expect(state.view.value.messages).toEqual([]);
  });
});
