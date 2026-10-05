import {
  AGENT_APPROVAL_STATE,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import type { TableAssistantProps } from "@adapttable/vue/assistant";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp, h, isVNode, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  AgentApproval,
  agentApproval,
  TableAssistant,
  tableAssistant,
} from "../src/assistant";
import { nativeAssistantSlots } from "../src/assistant/nativeSlots";
const stops: (() => void)[] = [];
const show = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal"
);
const close = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close"
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterAll(() => {
  if (show)
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", show);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (close) Object.defineProperty(HTMLDialogElement.prototype, "close", close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const options = (): TableAssistantProps => ({
  assistant: {
    status: "ready",
    messages: [],
    draft: "hello",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [{ id: "one", title: "One", description: "A choice" }],
    runSuggestion: vi.fn(),
  },
  open: true,
  onOpenChange: vi.fn(),
  speech: {
    available: true,
    languages: ["en", "fr"],
    state: { status: "idle", language: "en", interim: "" },
    start: vi.fn(),
    stop: vi.fn(),
    setLanguage: vi.fn(),
  },
});
function mount(render: () => ReturnType<typeof h>) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ setup: () => render });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
const find = <T extends HTMLElement>(root: ParentNode, part: string): T => {
  const value = root.querySelector<T>(`[data-adapttable-part="${part}"]`);
  if (!value) throw new Error(part);
  return value;
};
describe("native assistant controls", () => {
  it("wires actual native input, menu, language and button events", async () => {
    const props = options();
    const root = mount(() => h(TableAssistant, props));
    await nextTick();
    const input = find<HTMLTextAreaElement>(root, "assistant-input");
    input.value = "new";
    input.dispatchEvent(new Event("input"));
    expect(props.assistant.setDraft).toHaveBeenCalledWith("new");
    const menu = find<HTMLDetailsElement>(root, "assistant-examples");
    find(root, "assistant-examples-menu").click();
    find(root, "assistant-examples-item").click();
    await nextTick();
    await nextTick();
    await nextTick();
    expect(props.assistant.runSuggestion).toHaveBeenCalledWith("one");
    expect(menu.open).toBe(false);
    const language = find<HTMLSelectElement>(root, "assistant-voice-language");
    language.value = "fr";
    language.dispatchEvent(new Event("change"));
    expect(props.speech?.setLanguage).toHaveBeenCalledWith("fr");
    find(root, "assistant-voice").click();
    expect(props.speech?.start).toHaveBeenCalledOnce();
    find(root, "assistant-send").click();
    expect(props.assistant.send).toHaveBeenCalledOnce();
  });
  it("uses a native modal dialog, forwards cancellation, and closes on removal", async () => {
    const props = shallowRef({
      ...options(),
      presentation: "sheet" as const,
      dir: "rtl" as const,
    });
    const root = mount(() => h(TableAssistant, props.value));
    await nextTick();
    await nextTick();
    const dialog = find<HTMLDialogElement>(root, "assistant-sheet");
    expect(dialog.open).toBe(true);
    expect(dialog.dir).toBe("rtl");
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(props.value.onOpenChange).toHaveBeenCalledWith(false);
    dialog.click();
    expect(props.value.onOpenChange).toHaveBeenCalledTimes(2);
    props.value = { ...props.value, open: false };
    await nextTick();
    expect(dialog.open).toBe(false);
  });
  it("renders both optional feature fills from the shared shell without importing AI", async () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const pending = {
      presentation: "table" as const,
      proposals: [{ rowKey: "one", after: "Grace" }],
      decisions: ["pending" as const],
      approve,
      reject,
    };
    const publish: StaticTableFeature = {
      id: "fixture-approval",
      mount: (context) => {
        context.state.set(AGENT_APPROVAL_STATE, pending);
      },
    };
    const root = mount(() =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "one", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        features: [tableAssistant(), agentApproval(), publish],
        assistant: options(),
        classNames: {
          agentApproval: "approval-strip",
          agentApprovalButton: "approval-button",
        },
      })
    );
    await nextTick();
    expect(find(root, "agent-approval").className).toBe("approval-strip");
    expect(find(root, "agent-approval-approve").className).toBe(
      "approval-button"
    );
    expect(find(root, "assistant-panel")).toBeInstanceOf(HTMLElement);
    find(root, "agent-approval-approve").click();
    await nextTick();
    await nextTick();
    await nextTick();
    expect(approve).toHaveBeenCalledOnce();
  });
  it("keeps table approval absent when a different surface owns it", () => {
    const root = mount(() =>
      h(AgentApproval, {
        pending: {
          presentation: "widget",
          proposals: [],
          decisions: [],
          approve: vi.fn(),
          reject: vi.fn(),
        },
      })
    );
    expect(root.textContent).toBe("");
  });
  it("forwards optional button content, expansion, and a nonmodal floating surface", () => {
    const click = vi.fn();
    const root = mount(() =>
      h("div", [
        nativeAssistantSlots.Button({
          label: "icon label",
          icon: h("b", "glyph"),
          iconOnly: true,
          expanded: false,
          tooltip: "tip",
          part: "custom-button",
          onClick: click,
        }),
        nativeAssistantSlots.Window({
          label: "window",
          part: "custom-window",
          children: "content",
          style: { position: "fixed" },
        }),
      ])
    );
    expect(find(root, "custom-button").textContent).toBe("glyph");
    expect(find(root, "custom-button").getAttribute("aria-label")).toBe(
      "icon label"
    );
    find(root, "custom-button").click();
    expect(click).toHaveBeenCalledOnce();
    expect(find(root, "custom-window").style.position).toBe("fixed");
  });
  it("ignores malformed control events and an empty example choice", () => {
    const change = vi.fn();
    const nodes = [
      nativeAssistantSlots.Composer({
        label: "draft",
        placeholder: "draft",
        part: "input",
        value: "",
        onChange: change,
        onKeyDown: vi.fn(),
      }),
      nativeAssistantSlots.LanguageChip({
        label: "language",
        part: "language",
        value: "en",
        options: [],
        onChange: change,
      }),
    ];
    for (const node of nodes) {
      if (!isVNode(node)) throw new Error("Expected control VNode");
      const handler = node.props?.onInput ?? node.props?.onChange;
      handler(new Event("change"));
    }
    expect(change).not.toHaveBeenCalled();
    const root = mount(() =>
      h("div", [
        nativeAssistantSlots.Menu({
          label: "examples",
          part: "examples",
          items: [],
          onSelect: change,
        }),
        nativeAssistantSlots.Button({
          label: "fallback",
          part: "content-button",
          iconOnly: true,
          children: "custom",
          onClick: vi.fn(),
        }),
      ])
    );
    find(root, "examples").dispatchEvent(new Event("change"));
    expect(change).not.toHaveBeenCalled();
    expect(find(root, "content-button").textContent).toBe("custom");
  });
  it("keeps a closed native sheet inert and does not mistake content for backdrop", async () => {
    const open = shallowRef(false);
    const close = vi.fn();
    const root = mount(() =>
      h("div", [
        nativeAssistantSlots.Sheet({
          label: "modal",
          part: "test-sheet",
          open: open.value,
          onClose: close,
          children: h("span", { "data-testid": "inside" }, "inside"),
        }),
      ])
    );
    await nextTick();
    const dialog = find<HTMLDialogElement>(root, "test-sheet");
    expect(dialog.open).toBe(false);
    open.value = true;
    await nextTick();
    await nextTick();
    expect(dialog.open).toBe(true);
    root.querySelector<HTMLElement>('[data-testid="inside"]')?.click();
    expect(close).not.toHaveBeenCalled();
    dialog.close();
    open.value = false;
    await nextTick();
    expect(dialog.open).toBe(false);
  });
  it("keeps microphone Stop operable while disconnected and supports retry after an error", async () => {
    const initial = options();
    const stop = vi.fn();
    const start = vi.fn();
    const props = shallowRef<TableAssistantProps>({
      ...initial,
      assistant: { ...initial.assistant, status: "disconnected" },
      speech: {
        available: true,
        languages: ["en"],
        state: { status: "listening", language: "en", interim: "" },
        start,
        stop,
        setLanguage: vi.fn(),
      },
    });
    const root = mount(() => h(TableAssistant, props.value));
    await nextTick();
    const microphone = find<HTMLButtonElement>(root, "assistant-voice");
    expect(microphone.disabled).toBe(false);
    microphone.click();
    expect(stop).toHaveBeenCalledOnce();
    const speech = props.value.speech;
    if (!speech) throw new Error("missing speech");
    props.value = {
      ...props.value,
      speech: {
        ...speech,
        state: {
          status: "error",
          language: "en",
          interim: "",
          error: "Microphone failed",
        },
      },
    };
    await nextTick();
    expect(find<HTMLButtonElement>(root, "assistant-voice").disabled).toBe(
      true
    );
    expect(find(root, "assistant-voice-error").textContent).toBe(
      "Microphone failed"
    );
    props.value = {
      ...props.value,
      assistant: { ...initial.assistant, status: "ready" },
    };
    await nextTick();
    find<HTMLButtonElement>(root, "assistant-voice").click();
    expect(start).toHaveBeenCalledOnce();
  });
  it("stops an independently owned speech handle on final assistant disposal", async () => {
    const initial = options();
    const stop = vi.fn();
    const root = document.createElement("div");
    const app = createApp({
      render: () =>
        h(TableAssistant, {
          ...initial,
          speech: {
            available: true,
            state: { status: "listening", language: "en", interim: "" },
            languages: ["en"],
            start: vi.fn(),
            stop,
            setLanguage: vi.fn(),
          },
        }),
    });
    app.mount(root);
    await nextTick();
    expect(stop).not.toHaveBeenCalled();
    app.unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
  it("does not answer when the native composer draft callback synchronously unmounts the assistant", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const answer = vi.fn();
    const initial = options();
    const app = createApp({
      render: () =>
        h(TableAssistant, {
          ...initial,
          assistant: {
            ...initial.assistant,
            status: "awaiting-user",
            draft: "yes",
            messages: [
              {
                id: "message",
                role: "assistant",
                text: "Choose?",
                question: {
                  id: "question",
                  question: "Choose?",
                  allowFreeText: true,
                },
              },
            ],
            setDraft: () => app.unmount(),
            answer,
          },
        }),
    });
    app.mount(root);
    await nextTick();
    find<HTMLButtonElement>(root, "assistant-send").click();
    await nextTick();
    await nextTick();
    await nextTick();
    expect(root.childElementCount).toBe(0);
    expect(answer).not.toHaveBeenCalled();
    root.remove();
  });
});
