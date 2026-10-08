import { AGENT_APPROVAL_STATE } from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable } from "../src";
import {
  AgentApproval,
  agentApproval,
  type AgentApprovalProps,
  TableAssistant,
  tableAssistant,
  type TableAssistantProps,
} from "../src/assistant";
import { shadcnAssistantControls } from "../src/assistant/controls";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function view(): TableAssistantProps["assistant"] {
  return {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [
      { id: "one", title: "Find Ada", description: "Locate a matching row" },
    ],
    runSuggestion: vi.fn(),
  };
}
it("selects a language through the copied shadcn Native Select, then disables it while listening", async () => {
  const language = vi.fn();
  const start = vi.fn();
  const stop = vi.fn();
  const speech = shallowRef<NonNullable<TableAssistantProps["speech"]>>({
    available: true,
    state: { status: "idle", language: "en", interim: "" },
    languages: ["en", "fr"],
    setLanguage: language,
    start,
    stop,
  });
  const assistant = view();
  mount(() =>
    h(TableAssistant, {
      assistant,
      speech: speech.value,
      open: true,
      onOpenChange: vi.fn(),
    })
  );
  await flush();
  const trigger = element<HTMLSelectElement>(part("assistant-voice-language"));
  expect(trigger.getAttribute("data-slot")).toBe("native-select");
  trigger.value = "fr";
  trigger.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
  expect(language).toHaveBeenCalledExactlyOnceWith("fr");
  expect(trigger.value).toBe("en");
  element<HTMLButtonElement>(part("assistant-voice")).click();
  expect(start).toHaveBeenCalledTimes(1);
  speech.value = {
    ...speech.value,
    state: { status: "listening", language: "en", interim: "Ada" },
  };
  await flush();
  expect(trigger.disabled).toBe(true);
  expect(element(part("assistant-voice-status")).textContent).toBe("Listening");
  element<HTMLButtonElement>(part("assistant-voice")).click();
  expect(stop).toHaveBeenCalledTimes(1);
});
it("selects current suggestions and rejects a retired menu item after suggestions change", async () => {
  const first = view();
  const selected = vi.fn();
  const assistant = shallowRef<TableAssistantProps["assistant"]>({
    ...first,
    runSuggestion: selected,
  });
  mount(() =>
    h(TableAssistant, {
      assistant: assistant.value,
      open: true,
      onOpenChange: vi.fn(),
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("assistant-examples-menu"));
  trigger.click();
  await flush();
  const old = element<HTMLElement>('[role="menuitem"]');
  expect(old.textContent).toContain("Locate a matching row");
  old.focus();
  await key(old, "Enter");
  expect(selected).toHaveBeenCalledExactlyOnceWith("one");
  trigger.click();
  await flush();
  const retired = element<HTMLElement>('[role="menuitem"]');
  assistant.value = {
    ...assistant.value,
    suggestions: [{ id: "two", title: "Current shortcut" }],
  };
  await flush();
  expect(document.querySelector('[role="menu"]')).toBeNull();
  retired.click();
  await flush();
  expect(selected).toHaveBeenCalledTimes(1);
  trigger.click();
  await flush();
  const current = element<HTMLElement>('[role="menuitem"]');
  expect(current.textContent).toBe("Current shortcut");
  current.focus();
  await key(current, "Enter");
  expect(selected).toHaveBeenLastCalledWith("two");
});
it("routes actual sheet backdrop dismissal once and honors rejected then accepted host close", async () => {
  const open = shallowRef(true);
  const accept = shallowRef(false);
  const changed = vi.fn((next: boolean) => {
    if (accept.value) open.value = next;
  });
  const assistant = view();
  mount(() =>
    h(TableAssistant, {
      assistant,
      open: open.value,
      onOpenChange: changed,
      presentation: "sheet",
    })
  );
  await flush();
  const dismiss = async () => {
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 })
    );
    await flush();
  };
  await dismiss();
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  expect(document.querySelector(part("assistant-sheet"))).not.toBeNull();
  accept.value = true;
  await dismiss();
  expect(changed).toHaveBeenCalledTimes(2);
  expect(document.querySelector(part("assistant-sheet"))).toBeNull();
});
it("renders the registered assistant feature with the table's class context and host draft", async () => {
  const assistant = view();
  const changed = vi.fn();
  const host = mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      forceMobile: false,
      urlSync: false,
      features: [tableAssistant()],
      assistant: {
        assistant,
        open: true,
        onOpenChange: changed,
        presentation: "panel",
      },
    })
  );
  await flush();
  expect(host.textContent).toContain("Ada");
  expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
  element<HTMLButtonElement>(part("assistant-close")).click();
  await flush();
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
});

it("uses a copied assistant Sheet with one close request, nested menu Escape and controlled draft ownership", async () => {
  const open = shallowRef(false);
  const accept = shallowRef(false);
  const draft = shallowRef("");
  const send = vi.fn();
  const suggested = vi.fn();
  const close = vi.fn((value: boolean) => {
    if (value || accept.value) open.value = value;
  });
  const assistant = (): TableAssistantProps["assistant"] => ({
    status: "ready",
    messages: [],
    draft: draft.value,
    setDraft: (value) => {
      draft.value = value;
    },
    send,
    stop: vi.fn(),
    suggestions: [
      { id: "find", title: "Find Ada", description: "Show a matching row" },
    ],
    runSuggestion: suggested,
  });
  mount(() =>
    h(TableAssistant, {
      assistant: assistant(),
      open: open.value,
      onOpenChange: close,
      presentation: "sheet",
      dir: "rtl",
    })
  );
  await flush();
  const launcher = element<HTMLButtonElement>(part("assistant-launcher"));
  launcher.focus();
  launcher.click();
  await flush();
  const sheet = element(part("assistant-sheet"));
  expect(sheet.getAttribute("role")).toBe("dialog");
  expect(sheet.getAttribute("dir")).toBe("rtl");
  const input = element<HTMLTextAreaElement>(part("assistant-input"));
  expect(input.tagName).toBe("TEXTAREA");
  expect(input.getAttribute("data-slot")).toBe("textarea");
  expect(sheet.getAttribute("data-slot")).toBe("sheet-content");
  expect(document.activeElement).toBe(input);
  input.value = "Find Ada";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(draft.value).toBe("Find Ada");
  await key(input, "Enter");
  expect(send).toHaveBeenCalledTimes(1);
  const menu = element<HTMLButtonElement>(part("assistant-examples-menu"));
  menu.focus();
  menu.click();
  await flush();
  const item = element<HTMLElement>('[role="menuitem"]');
  expect(sheet.contains(item)).toBe(false);
  await key(item, "Escape");
  expect(open.value).toBe(true);
  expect(document.activeElement).toBe(menu);
  expect(close).toHaveBeenCalledTimes(1);
  await key(input, "Escape");
  expect(open.value).toBe(true);
  expect(close).toHaveBeenCalledTimes(2);
  accept.value = true;
  await key(input, "Escape");
  expect(close).toHaveBeenCalledTimes(3);
  expect(open.value).toBe(false);
  expect(launcher.isConnected).toBe(false);
  expect(document.activeElement).toBe(element(part("assistant-launcher")));
  expect(suggested).not.toHaveBeenCalled();
});
it("retires assistant sheet and menu portals in KeepAlive and preserves host focus", async () => {
  const visible = shallowRef(true);
  const open = shallowRef(true);
  const assistant: TableAssistantProps["assistant"] = {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [{ id: "one", title: "One" }],
    runSuggestion: vi.fn(),
  };
  const Child = defineComponent({
    render: () =>
      h(TableAssistant, {
        assistant,
        open: open.value,
        onOpenChange: (value) => {
          open.value = value;
        },
        presentation: "sheet",
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  mount(() =>
    h("div", [
      h("input", { id: "assistant-outside" }),
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Child) : h(Other)),
      }),
    ])
  );
  await flush();
  element<HTMLButtonElement>(part("assistant-examples-menu")).click();
  await flush();
  expect(document.querySelector('[role="menu"]')).not.toBeNull();
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#assistant-outside");
  outside.focus();
  await flush();
  expect(document.querySelector(part("assistant-sheet"))).toBeNull();
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
  visible.value = true;
  await flush();
  expect(document.querySelectorAll(part("assistant-sheet"))).toHaveLength(1);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(element(part("assistant-input")));
});
it("keeps approval decisions scoped to the current proposal", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const make = (approve: () => void): AgentApprovalProps["pending"] => ({
    presentation: "table",
    identity: Object.freeze({}),
    proposals: [{ rowKey: "a", column: "name", before: "Ada", after: "Grace" }],
    decisions: ["pending"],
    approve,
    reject: vi.fn(),
  });
  const pending = shallowRef(make(first));
  mount(() => h(AgentApproval, { pending: pending.value }));
  await flush();
  element<HTMLButtonElement>(part("agent-approval-approve")).click();
  pending.value = make(second);
  await flush();
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  element<HTMLButtonElement>(part("agent-approval-approve")).click();
  await flush();
  expect(second).toHaveBeenCalledTimes(1);
});

it("keeps a rejected host draft visible, preserves multiline editing, and exposes busy stop as a shadcn Button", async () => {
  const assistant = shallowRef(view());
  assistant.value = { ...assistant.value, draft: "Original" };
  const settings = vi.fn();
  mount(() =>
    h(TableAssistant, {
      assistant: assistant.value,
      open: true,
      onOpenChange: vi.fn(),
      onSettings: settings,
      className: "consumer-assistant",
    })
  );
  await flush();
  const input = element<HTMLTextAreaElement>(part("assistant-input"));
  input.value = "Rejected";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(assistant.value.setDraft).toHaveBeenCalledExactlyOnceWith("Rejected");
  expect(input.value).toBe("Original");
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
  );
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  expect(assistant.value.send).not.toHaveBeenCalled();
  expect(
    element(part("assistant-panel")).classList.contains("consumer-assistant")
  ).toBe(true);
  element(part("assistant-settings")).click();
  expect(settings).toHaveBeenCalledTimes(1);
  assistant.value = { ...assistant.value, status: "sending" };
  await flush();
  const stop = element<HTMLButtonElement>(part("assistant-stop"));
  expect(stop.getAttribute("data-slot")).toBe("button");
  stop.click();
  expect(assistant.value.stop).toHaveBeenCalledTimes(1);
  expect(
    element<HTMLButtonElement>(part("assistant-examples-menu")).disabled
  ).toBe(true);
});

it("uses a floating shadcn surface on desktop and the copied Sheet on a narrow viewport", async () => {
  const width = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1000);
  const assistant = view();
  const boundary = document.createElement("div");
  document.body.append(boundary);
  mount(() =>
    h(TableAssistant, {
      assistant,
      open: true,
      onOpenChange: vi.fn(),
      presentation: "floating",
      boundary: { current: boundary },
      className: "consumer-floating",
    })
  );
  await flush();
  const panel = element(part("assistant-window"));
  expect(boundary.contains(panel)).toBe(true);
  expect(panel.style.position).toBe("absolute");
  expect(panel.classList.contains("consumer-floating")).toBe(true);
  width.mockReturnValue(400);
  window.dispatchEvent(new Event("resize"));
  await flush();
  expect(document.querySelector(part("assistant-window"))).toBeNull();
  expect(element(part("assistant-sheet")).getAttribute("data-slot")).toBe(
    "sheet-content"
  );
});

it("renders registered approval controls from the table-owned proposal and handles per-row decisions", async () => {
  const decide = vi.fn();
  const reject = vi.fn();
  const pending: NonNullable<AgentApprovalProps["pending"]> = {
    presentation: "table",
    proposals: [
      { rowKey: "a", column: "name", before: "Ada", after: "Grace" },
      { rowKey: "b", column: "name", before: "Bea", after: "Lin" },
    ],
    decisions: ["pending", "pending"],
    approve: vi.fn(),
    reject,
    decideAt: decide,
  };
  const host = mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      forceMobile: true,
      urlSync: false,
      classNames: {
        agentApproval: "consumer-review",
        agentApprovalButton: "consumer-approval-button",
      },
      features: [
        agentApproval(),
        {
          id: "host-proposal",
          mount: ({ state }) => state.set(AGENT_APPROVAL_STATE, pending),
        },
      ],
    })
  );
  await flush();
  const list = element(part("agent-approval-list"));
  expect(list.tagName).toBe("UL");
  expect(list.classList.contains("consumer-review")).toBe(true);
  const button = element<HTMLButtonElement>(
    part("approval-review-row-approve")
  );
  expect(button.getAttribute("data-slot")).toBe("button");
  expect(button.classList.contains("consumer-approval-button")).toBe(true);
  button.click();
  await flush();
  expect(decide).toHaveBeenCalledExactlyOnceWith(0, true);
  element(part("agent-approval-reject")).click();
  await flush();
  expect(reject).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Ada");
});

it("maps assistant variants and icon-only controls to genuine shadcn buttons without losing names", async () => {
  const clicked = vi.fn();
  const host = mount(() =>
    h("div", [
      shadcnAssistantControls.Button({
        label: "Approve",
        part: "test-primary",
        variant: "primary",
        icon: h("span", { "aria-hidden": true }, "✓"),
        iconOnly: true,
        onClick: clicked,
        tooltip: "Approve proposal",
        expanded: true,
        className: "consumer-icon",
      }),
      shadcnAssistantControls.Button({
        label: "More",
        part: "test-subtle",
        variant: "subtle",
        children: "Details",
        onClick: clicked,
      }),
      shadcnAssistantControls.Button({
        label: "Fallback label",
        part: "test-icon-fallback",
        variant: "secondary",
        iconOnly: true,
        onClick: clicked,
      }),
    ])
  );
  await flush();
  const primary = element<HTMLButtonElement>(part("test-primary"));
  expect(primary.getAttribute("data-slot")).toBe("button");
  expect(primary.getAttribute("data-variant")).toBe("default");
  expect(primary.getAttribute("data-size")).toBe("icon");
  expect(primary.getAttribute("aria-label")).toBe("Approve");
  expect(primary.getAttribute("aria-expanded")).toBe("true");
  expect(primary.title).toBe("Approve proposal");
  expect(primary.textContent).toBe("✓");
  expect(primary.classList.contains("consumer-icon")).toBe(true);
  primary.click();
  expect(clicked).toHaveBeenCalledTimes(1);
  expect(element(part("test-subtle")).getAttribute("data-variant")).toBe(
    "ghost"
  );
  expect(element(part("test-subtle")).textContent).toBe("Details");
  expect(element(part("test-icon-fallback")).textContent).toBe(
    "Fallback label"
  );
  expect(host.querySelectorAll('[data-slot="button"]')).toHaveLength(3);
});
