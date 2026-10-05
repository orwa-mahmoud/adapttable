import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { testSlots } from "../../test/assistant-fixtures";
import {
  AssistantMessage,
  type AssistantMessageProps,
} from "./assistantMessages";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};
const parts = {
  row: "assistant-receipt-undo-button",
  turn: "assistant-receipts-undo-all-button",
  lone: "assistant-undo-button",
  save: "assistant-message-action-button",
} as const;
type Action = keyof typeof parts;
function host(kind: Action) {
  const callbacks = new Map<string, (() => void)[]>();
  const undo = vi.fn();
  const undoAction = vi.fn();
  const save = vi.fn();
  const props = shallowRef<AssistantMessageProps>({
    message: {
      id: "same-message",
      role: "assistant",
      text: "Changed",
      receipts: ["sort", "search"].map((key) => ({
        idempotencyKey: key,
        status: "executed",
        undoable: true,
        subject: { kind: key },
      })),
    },
    receipts: kind !== "lone",
    undo: { messageId: "same-message", available: true },
    onUndo: undo,
    onUndoAction: undoAction,
    action: { label: "Save", onRun: save },
    slots: {
      ...testSlots,
      Button: (input) => {
        callbacks.set(input.part, [
          ...(callbacks.get(input.part) ?? []),
          input.onClick,
        ]);
        return testSlots.Button(input);
      },
    },
  });
  const visible = shallowRef(true);
  const Child = defineComponent({
    setup: () => () => h(AssistantMessage, props.value),
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) }),
  });
  app.mount(root);
  let mounted = true;
  const dispose = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  stops.push(dispose);
  const latest = (part = parts[kind]) => {
    const callback = callbacks.get(part)?.at(-1);
    if (!callback) throw new Error(part);
    return callback;
  };
  const open = async () => {
    await settle();
    if (kind === "row" || kind === "turn") {
      root
        .querySelector<HTMLButtonElement>(
          '[data-adapttable-part="assistant-receipts-toggle-button"]'
        )
        ?.click();
      await settle();
    }
  };
  const invoked = { row: undoAction, turn: undo, lone: undo, save }[kind];
  return {
    props,
    root,
    visible,
    dispose,
    latest,
    open,
    invoked,
    undo,
    undoAction,
    save,
  };
}
describe.each<Action>(["row", "turn", "lone", "save"])(
  "%s action ownership",
  (kind) => {
    it("allows fresh controls and permanently retires retained callbacks on disposal", async () => {
      const x = host(kind);
      await x.open();
      const stale = x.latest();
      stale();
      expect(x.invoked).toHaveBeenCalledOnce();
      x.invoked.mockClear();
      x.dispose();
      stale();
      expect(x.invoked).not.toHaveBeenCalled();
    });
    it("retires callbacks through KeepAlive while allowing newly rendered controls after activation", async () => {
      const x = host(kind);
      await x.open();
      const stale = x.latest();
      x.visible.value = false;
      await settle();
      stale();
      expect(x.invoked).not.toHaveBeenCalled();
      x.visible.value = true;
      await settle();
      stale();
      expect(x.invoked).not.toHaveBeenCalled();
      x.latest()();
      expect(x.invoked).toHaveBeenCalledOnce();
    });
    it("never redirects an old control to a replacement host with reused receipt and undo objects", async () => {
      const x = host(kind);
      await x.open();
      const stale = x.latest();
      const replacement = vi.fn();
      const updates: Record<Action, Partial<AssistantMessageProps>> = {
        row: { onUndoAction: replacement },
        turn: { onUndo: replacement },
        lone: { onUndo: replacement },
        save: { action: { label: "Save", onRun: replacement } },
      };
      x.props.value = { ...x.props.value, ...updates[kind] };
      await settle();
      stale();
      expect(x.invoked).not.toHaveBeenCalled();
      expect(replacement).not.toHaveBeenCalled();
      x.latest()();
      expect(replacement).toHaveBeenCalledOnce();
    });
  }
);
it.each<Action>(["row", "turn"])(
  "retires a %s undo when the receipt group is removed and reopened",
  async (kind) => {
    const x = host(kind);
    await x.open();
    const stale = x.latest();
    const toggle = () =>
      x.root
        .querySelector<HTMLButtonElement>(
          '[data-adapttable-part="assistant-receipts-toggle-button"]'
        )
        ?.click();
    toggle();
    await settle();
    stale();
    expect(x.invoked).not.toHaveBeenCalled();
    toggle();
    await settle();
    stale();
    expect(x.invoked).not.toHaveBeenCalled();
    x.latest()();
    expect(x.invoked).toHaveBeenCalledOnce();
  }
);
it("does not admit another host action from a reentrant save callback that disposes the owner", async () => {
  const x = host("turn");
  await x.open();
  let undo: () => void = () => undefined;
  const save = vi.fn(() => {
    x.dispose();
    undo();
  });
  x.props.value = { ...x.props.value, action: { label: "Save", onRun: save } };
  await settle();
  undo = x.latest();
  x.latest(parts.save)();
  expect(save).toHaveBeenCalledOnce();
  expect(x.undo).not.toHaveBeenCalled();
});
it("does not reenter a host action while the current undo callback is running", async () => {
  const x = host("turn");
  await x.open();
  let reenter: () => void = () => undefined;
  const undo = vi.fn(() => reenter());
  x.props.value = { ...x.props.value, onUndo: undo };
  await settle();
  reenter = x.latest();
  reenter();
  expect(undo).toHaveBeenCalledOnce();
});
