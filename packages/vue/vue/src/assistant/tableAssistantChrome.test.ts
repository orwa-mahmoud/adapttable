import type { AgentApprovalPending } from "@adapttable/core";
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
import type { TableAssistantView } from "./contracts";
import {
  TableAssistantChrome,
  type TableAssistantChromeProps,
} from "./tableAssistantChrome";

const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
});
const view = (patch: Partial<TableAssistantView> = {}): TableAssistantView => ({
  status: "ready",
  messages: [],
  draft: "",
  setDraft: vi.fn(),
  send: vi.fn(),
  stop: vi.fn(),
  suggestions: [],
  runSuggestion: vi.fn(),
  ...patch,
});
const pending = (
  presentation: AgentApprovalPending["presentation"] = "widget"
): AgentApprovalPending => ({
  presentation,
  proposals: [{ rowKey: "one", column: "name", before: "Ada", after: "Grace" }],
  decisions: ["pending"],
  approve: vi.fn(),
  reject: vi.fn(),
});
function mount(patch: Partial<TableAssistantChromeProps> = {}) {
  const props = shallowRef<TableAssistantChromeProps>({
    assistant: view(),
    open: true,
    onOpenChange: vi.fn(),
    slots: testSlots,
    ...patch,
  });
  const visible = shallowRef(true);
  const Child = defineComponent({
    setup: () => () => h(TableAssistantChrome, props.value),
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) }),
  });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  const find = (part: string) =>
    document.querySelector<HTMLElement>(`[data-adapttable-part="${part}"]`);
  const click = async (part: string) => {
    const element = find(part);
    if (!element) throw new Error(`Missing ${part}`);
    element.click();
    await nextTick();
    await nextTick();
  };
  const update = async (next: Partial<TableAssistantChromeProps>) => {
    props.value = { ...props.value, ...next };
    await nextTick();
  };
  return { props, root, find, click, update, visible };
}
describe("TableAssistantChrome", () => {
  it("focuses the composer, uses required controls, escapes untrusted text and restores the launcher", async () => {
    const opened = vi.fn();
    const host = mount({
      onOpenChange: opened,
      assistant: view({
        messages: [
          { id: "1", role: "assistant", text: "<img src=x onerror=bad()>" },
        ],
      }),
    });
    await nextTick();
    expect(document.activeElement).toBe(host.find("assistant-input"));
    expect(host.find("assistant-message-text")?.textContent).toBe(
      "What would you like to do?"
    );
    expect(host.root.querySelector("img")).toBeNull();
    expect(host.root.textContent).toContain("<img src=x onerror=bad()>");
    await host.click("assistant-close");
    expect(opened).toHaveBeenCalledWith(false);
    await host.update({ open: false });
    expect(document.activeElement).toBe(host.find("assistant-launcher"));
    await host.click("assistant-launcher");
    expect(opened).toHaveBeenCalledWith(true);
    await host.update({ launcher: false });
    expect(host.find("assistant-launcher")).toBeNull();
  });
  it("sends on Enter, leaves Shift+Enter and IME to editing, and stops busy turns", async () => {
    const send = vi.fn();
    const stop = vi.fn();
    const draft = vi.fn();
    const host = mount({
      assistant: view({ draft: "hello", send, stop, setDraft: draft }),
    });
    const input = host.find("assistant-input");
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
    );
    input?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    expect(send).not.toHaveBeenCalled();
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(send).toHaveBeenCalledOnce();
    if (input instanceof HTMLTextAreaElement) {
      input.value = "new";
      input.dispatchEvent(new Event("input"));
    }
    expect(draft).toHaveBeenCalledWith("new");
    await host.update({
      assistant: view({ status: "sending", busy: true, draft: "queued", stop }),
    });
    await host.click("assistant-stop");
    expect(stop).toHaveBeenCalledOnce();
    expect(host.find("assistant-working")?.textContent).toContain("Working");
    await host.update({ assistant: view({ status: "disconnected" }) });
    expect(host.find("assistant-unavailable")).not.toBeNull();
    expect(host.find("assistant-input")?.hasAttribute("disabled")).toBe(true);
  });
  it("answers a question through the same composer and drops a stale choice", async () => {
    const answer = vi.fn();
    const setDraft = vi.fn();
    const question = {
      id: "scope",
      question: "Which?",
      allowFreeText: true,
      options: [{ id: "all", label: "All" }],
    };
    const host = mount({
      assistant: view({
        busy: true,
        status: "awaiting-user",
        draft: "visible",
        answer,
        setDraft,
        messages: [{ id: "q", role: "assistant", text: "", question }],
      }),
    });
    await host.click("assistant-send");
    expect(answer).toHaveBeenCalledWith({ text: "visible" });
    expect(setDraft).toHaveBeenCalledWith("");
    await host.click("assistant-question-option");
    expect(answer).toHaveBeenCalledWith({ optionId: "all" });
    answer.mockClear();
    host.find("assistant-question-option")?.click();
    host.props.value = { ...host.props.value, assistant: view() };
    await nextTick();
    await nextTick();
    expect(answer).not.toHaveBeenCalled();
  });
  it("offers examples, optional speech, languages and explicit dictation errors", async () => {
    const suggestion = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();
    const language = vi.fn();
    const speech = {
      available: true,
      state: { status: "idle" as const, language: "en", interim: "" },
      languages: ["en", "fr"],
      start,
      stop,
      setLanguage: language,
    };
    const host = mount({
      assistant: view({
        suggestions: [{ id: "find", title: "Find Ada" }],
        runSuggestion: suggestion,
      }),
      speech,
    });
    const examples = host.find("assistant-examples-menu");
    examples?.dispatchEvent(new Event("change"));
    expect(suggestion).toHaveBeenCalledWith("find");
    await host.click("assistant-voice");
    expect(start).toHaveBeenCalledOnce();
    const select = host.find("assistant-voice-language");
    if (select instanceof HTMLSelectElement) {
      select.value = "fr";
      select.dispatchEvent(new Event("change"));
    }
    expect(language).toHaveBeenCalledWith("fr");
    await host.update({
      speech: {
        ...speech,
        state: { status: "listening", language: "en", interim: "heard" },
      },
    });
    expect(host.find("assistant-voice-status")?.textContent).toBe("Listening");
    expect(
      host.find("assistant-voice-language")?.hasAttribute("disabled")
    ).toBe(true);
    await host.click("assistant-voice");
    expect(stop).toHaveBeenCalled();
    await host.update({
      speech: {
        ...speech,
        state: {
          status: "error",
          language: "en",
          interim: "",
          error: "Microphone failed",
        },
      },
    });
    expect(host.find("assistant-voice-error")?.textContent).toBe(
      "Microphone failed"
    );
    await host.update({ speech: { ...speech, available: false } });
    expect(host.find("assistant-voice")).toBeNull();
    await host.update({ speech: { ...speech, languages: ["en"] } });
    expect(host.find("assistant-voice-language")).toBeNull();
  });
  it("shows factual receipts, staged save reminders, per-action and whole-turn undo, and host actions", async () => {
    const undo = vi.fn();
    const undoAction = vi.fn();
    const action = vi.fn();
    const host = mount({
      avatars: { assistant: "Ada Lovelace", user: h("b", "Me") },
      greeting: "",
      messageAction: () => ({ label: "Open settings", onRun: action }),
      assistant: view({
        messages: [
          {
            id: "turn",
            role: "assistant",
            text: "done",
            receipts: [
              {
                idempotencyKey: "read",
                status: "executed",
                subject: { kind: "read" },
              },
              {
                idempotencyKey: "edit",
                capabilityKey: "edit.cells",
                status: "staged",
                undoable: true,
                message: "Details from host",
                subject: {
                  kind: "edit",
                  row: "Ada",
                  column: "Name",
                  before: "",
                  after: "Grace",
                  detail: "Name edit",
                },
              },
              {
                idempotencyKey: "sort",
                status: "executed",
                undoable: true,
                subject: { kind: "sort" },
              },
            ],
          },
        ],
        undo: { messageId: "turn", available: true },
        undoTurn: undo,
        undoAction,
      }),
    });
    expect(host.find("assistant-message-mark")?.textContent).toBe("AL");
    expect(host.find("assistant-receipt")).toBeNull();
    await host.click("assistant-receipts-toggle-button");
    expect(
      host.root.querySelectorAll('[data-adapttable-part="assistant-receipt"]')
    ).toHaveLength(2);
    expect(host.find("assistant-receipt-save-badge")?.textContent).toContain(
      "Save"
    );
    expect(host.find("assistant-receipt-before")?.textContent).toBe("");
    await host.click("assistant-receipt-detail");
    expect(host.find("assistant-receipt-message")?.textContent).toContain(
      "Details from host"
    );
    expect(host.find("assistant-receipt-capability")?.textContent).toBe(
      "edit.cells"
    );
    await host.click("assistant-receipt-undo-button");
    expect(undoAction).toHaveBeenCalledWith("edit");
    await host.click("assistant-receipts-undo-all-button");
    expect(undo).toHaveBeenCalledOnce();
    await host.click("assistant-message-action-button");
    expect(action).toHaveBeenCalledOnce();
    await host.update({ receipts: false });
    expect(host.find("assistant-receipts")).toBeNull();
    expect(host.find("assistant-undo-button")).not.toBeNull();
    await host.update({
      assistant: view({
        messages: [{ id: "voice", role: "user", text: "", transcribing: true }],
        undo: { messageId: "voice", available: false, blockedCode: "changed" },
        undoTurn: undo,
      }),
    });
    expect(host.find("assistant-message-text")?.textContent).toBe(
      "Voice message"
    );
    expect(host.find("assistant-undo-button")?.hasAttribute("disabled")).toBe(
      true
    );
  });
  it("keeps a single approval owner, rejects modal dismissal, and replaces stale callbacks", async () => {
    const approval = pending();
    const host = mount({ approval });
    await host.click("agent-approval-approve");
    expect(approval.approve).toHaveBeenCalledOnce();
    const modal = pending("modal");
    await host.update({ open: false, approval: modal, dir: "rtl" });
    expect(host.find("assistant-approval-modal")?.getAttribute("dir")).toBe(
      "rtl"
    );
    expect(
      host.find("assistant-launcher")?.getAttribute("aria-label")
    ).toContain("waiting");
    host.root.querySelector<HTMLElement>("[data-close-sheet]")?.click();
    await nextTick();
    await nextTick();
    await nextTick();
    expect(modal.reject).toHaveBeenCalledOnce();
    await host.update({ open: true, approval: pending("table") });
    expect(host.find("agent-approval-approve")).toBeNull();
    expect(host.find("assistant-approval-elsewhere")).not.toBeNull();
    await host.update({ approval });
    host.find("agent-approval-approve")?.click();
    host.props.value = { ...host.props.value, approval: pending() };
    await nextTick();
    await nextTick();
    expect(approval.approve).toHaveBeenCalledOnce();
  });
  it("shows progress, revocable session permissions, rejoin and actual errors", async () => {
    const revoke = vi.fn();
    const resume = vi.fn();
    const settings = vi.fn();
    const host = mount({
      note: "Read this",
      onSettings: settings,
      assistant: view({
        busy: true,
        status: "sending",
        progress: { done: 2, total: 5, label: "Rows" },
        alwaysAllowed: [{ capability: "custom", name: "Custom action" }],
        revokeAlwaysAllow: revoke,
      }),
    });
    expect(host.find("assistant-working")?.textContent).toContain("2");
    expect(host.find("assistant-empty-note")?.textContent).toBe("Read this");
    await host.click("assistant-always-allowed-revoke");
    expect(revoke).toHaveBeenCalledWith("custom");
    await host.click("assistant-settings");
    expect(settings).toHaveBeenCalledOnce();
    await host.update({
      assistant: view({
        status: "disconnected",
        resumable: { text: "resume work" },
        resume,
      }),
    });
    await host.click("assistant-rejoin");
    expect(resume).toHaveBeenCalledOnce();
    await host.update({
      assistant: view({ error: "bad", errorCode: "unknown-code" }),
    });
    expect(host.find("assistant-error")?.textContent).toBe("bad");
    await host.update({ assistant: view({ error: "unreachable" }) });
    expect(host.find("assistant-error")?.textContent).toBe("unreachable");
  });
  it("changes floating to a narrow sheet, supports a container, closes on Escape and releases resources", async () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1000);
    const onOpenChange = vi.fn();
    const host = mount({ presentation: "floating", onOpenChange });
    await nextTick();
    expect(host.find("assistant-window")?.style.position).toBe("fixed");
    const container = document.createElement("div");
    document.body.append(container);
    stops.push(() => container.remove());
    await host.update({ boundary: { current: container } });
    expect(
      container.querySelector('[data-adapttable-part="assistant-window"]')
    ).not.toBeNull();
    expect(host.find("assistant-window")?.style.position).toBe("absolute");
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(400);
    window.dispatchEvent(new Event("resize"));
    await nextTick();
    expect(host.find("assistant-sheet")).not.toBeNull();
    await host.click("assistant-back");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    host.find("assistant-surface")?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    const stop = vi.fn();
    await host.update({
      speech: {
        available: false,
        state: { status: "idle", language: "en", interim: "" },
        languages: ["en"],
        start: vi.fn(),
        stop,
        setLanguage: vi.fn(),
      },
    });
    host.visible.value = false;
    await nextTick();
    expect(stop).toHaveBeenCalled();
    host.visible.value = true;
    await nextTick();
    expect(host.find("assistant-sheet")).not.toBeNull();
  });
  it("does not steal scrolling and offers a jump for unseen transcript updates", async () => {
    const host = mount();
    await nextTick();
    const element = host.find("assistant-conversation");
    if (!element) throw new Error("missing conversation");
    Object.defineProperties(element, {
      scrollHeight: { value: 1000, configurable: true },
      clientHeight: { value: 100, configurable: true },
    });
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
    await host.update({
      assistant: view({
        messages: [{ id: "new", role: "assistant", text: "new" }],
      }),
    });
    expect(element.scrollTop).toBe(0);
    await host.click("assistant-jump-latest");
    expect(element.scrollTop).toBe(1000);
    expect(host.find("assistant-jump-latest")).toBeNull();
    await host.update({
      assistant: view({
        messages: [{ id: "newer", role: "assistant", text: "newer" }],
      }),
    });
    expect(element.scrollTop).toBe(1000);
  });
});
