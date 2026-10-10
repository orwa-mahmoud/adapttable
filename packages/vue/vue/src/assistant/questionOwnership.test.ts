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
import type { TableAssistantSlots, TableAssistantView } from "./contracts";
import { TableAssistantChrome } from "./tableAssistantChrome";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const question = () => ({
  id: "person",
  question: "Which person?",
  allowFreeText: true,
  options: [{ id: "ada", label: "Ada" }],
});
const view = (answer = vi.fn(), pending = question()): TableAssistantView => ({
  status: "awaiting-user",
  busy: true,
  messages: [
    { id: "turn", role: "assistant", text: "Choose", question: pending },
  ],
  draft: "typed answer",
  setDraft: vi.fn(),
  send: vi.fn(),
  stop: vi.fn(),
  suggestions: [],
  runSuggestion: vi.fn(),
  answer,
});
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};
function mount(initial = view()) {
  const current = shallowRef(initial);
  const visible = shallowRef(true);
  const retained = new Map<string, () => void>();
  const slots: TableAssistantSlots = {
    ...testSlots,
    Button: (props) => {
      retained.set(props.part, props.onClick);
      return testSlots.Button(props);
    },
  };
  const child = defineComponent({
    setup: () => () =>
      h(TableAssistantChrome, {
        assistant: current.value,
        open: true,
        onOpenChange: vi.fn(),
        slots,
      }),
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (visible.value ? h(child) : null) }),
  });
  app.mount(root);
  let disposed = false;
  const dispose = () => {
    if (!disposed) {
      disposed = true;
      app.unmount();
      root.remove();
    }
  };
  stops.push(dispose);
  const click = (part: string) => {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-adapttable-part="${part}"]`
    );
    if (!button) throw new Error(part);
    button.click();
  };
  return { current, visible, retained, dispose, click };
}
describe("question action ownership", () => {
  it.each(["choice", "draft"] as const)(
    "does not send an old %s into a replacement conversation reusing its question id",
    async (kind) => {
      const original = view();
      const replacement = view();
      const host = mount(original);
      await settle();
      host.click(
        kind === "choice" ? "assistant-question-option" : "assistant-send"
      );
      host.current.value = replacement;
      await settle();
      expect(original.answer).not.toHaveBeenCalled();
      expect(replacement.answer).not.toHaveBeenCalled();
      expect(original.setDraft).not.toHaveBeenCalled();
      expect(replacement.setDraft).not.toHaveBeenCalled();
    }
  );
  it("rejects a replacement question even when its id and answer method are reused", async () => {
    const answer = vi.fn();
    const original = view(answer);
    const host = mount(original);
    await settle();
    host.click("assistant-question-option");
    host.current.value = view(answer);
    await settle();
    expect(answer).not.toHaveBeenCalled();
  });
  it("rejects a replacement owner even when it retains the same question object", async () => {
    const pending = question();
    const old = vi.fn();
    const replacement = vi.fn();
    const host = mount(view(old, pending));
    await settle();
    host.click("assistant-question-option");
    host.current.value = view(replacement, pending);
    await settle();
    expect(old).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
  });
  it("keeps unchanged questions usable through new presentation wrappers and draft updates", async () => {
    const original = view();
    const host = mount(original);
    await settle();
    host.click("assistant-question-option");
    host.current.value = {
      ...original,
      messages: [...original.messages],
      draft: "new draft",
    };
    await settle();
    expect(original.answer).toHaveBeenCalledExactlyOnceWith({
      optionId: "ada",
    });
    host.click("assistant-send");
    await settle();
    expect(original.answer).toHaveBeenLastCalledWith({ text: "new draft" });
    expect(original.setDraft).toHaveBeenCalledExactlyOnceWith("");
  });
  it("does not erase text typed after a valid queued answer", async () => {
    const original = view();
    const host = mount(original);
    await settle();
    host.click("assistant-send");
    host.current.value = { ...original, draft: "keep newer typing" };
    await settle();
    expect(original.answer).toHaveBeenCalledWith({ text: "typed answer" });
    expect(original.setDraft).not.toHaveBeenCalled();
  });
  it.each(["deactivate", "dispose", "replace-and-return"] as const)(
    "rejects retained question controls after %s",
    async (mode) => {
      const original = view();
      const host = mount(original);
      await settle();
      const old = host.retained.get("assistant-question-option");
      const oldSend = host.retained.get("assistant-send");
      if (mode === "deactivate") {
        host.visible.value = false;
        await settle();
        host.visible.value = true;
        await settle();
      }
      if (mode === "dispose") host.dispose();
      if (mode === "replace-and-return") {
        host.current.value = view();
        await settle();
        host.current.value = original;
        await settle();
      }
      old?.();
      oldSend?.();
      await settle();
      expect(original.answer).not.toHaveBeenCalled();
      expect(original.setDraft).not.toHaveBeenCalled();
      if (mode !== "dispose") {
        host.click("assistant-question-option");
        await settle();
        expect(original.answer).toHaveBeenCalledWith({ optionId: "ada" });
      }
    }
  );
  it("does not answer work queued just before KeepAlive deactivation", async () => {
    const original = view();
    const host = mount(original);
    await settle();
    host.click("assistant-question-option");
    host.visible.value = false;
    await settle();
    expect(original.answer).not.toHaveBeenCalled();
  });
});
