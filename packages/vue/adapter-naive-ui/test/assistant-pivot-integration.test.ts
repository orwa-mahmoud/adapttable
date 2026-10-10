import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  AgentApproval,
  agentApproval,
  type AgentApprovalProps,
  TableAssistant,
  type TableAssistantProps,
} from "../src/assistant";
import { PivotPanel, type PivotPanelProps } from "../src/pivot";
import { standardFeatures } from "../src/preset";
import { mount as mountApp } from "./filter-helpers";

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
      code: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
async function pick(trigger: ParentNode, label: string | RegExp) {
  const input = trigger.querySelector<HTMLInputElement>(
    'input[role="combobox"]'
  );
  if (!input) throw new Error("Missing the select's combobox");
  input.click();
  await flush();
  const option = await vi.waitFor(() => {
    // Give the real vendor ResizeObserver a measurable jsdom viewport, once
    // the menu has mounted; the style write is the mutation that makes it
    // measure again.
    for (const list of document.querySelectorAll<HTMLElement>(
      ".n-virtual-list:not([style*='240px'])"
    )) {
      list.style.height = "240px";
      list.style.width = "240px";
      Object.defineProperties(list, {
        offsetHeight: { configurable: true, value: 240 },
        offsetWidth: { configurable: true, value: 240 },
        clientHeight: { configurable: true, value: 240 },
        clientWidth: { configurable: true, value: 240 },
      });
    }
    const found = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => {
      const text = node.textContent?.trim() ?? "";
      return typeof label === "string" ? text === label : label.test(text);
    });
    if (!found) throw new Error(`Missing option ${String(label)}`);
    return found;
  });
  option.click();
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const view = mountApp(render);
  stops.push(view.stop);
  return view.host;
}
it("uses a real NDrawer with one close request, nested menu Escape and controlled draft ownership", async () => {
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
  // Naive teleports a drawer's popovers into the drawer body, inside its
  // focus trap, rather than beside the trigger.
  expect(item.closest(".n-popover")).not.toBeNull();
  expect(menu.parentElement?.contains(item)).toBe(false);
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
it("uses Naive UI selects for controlled pivot configuration and mounts the complete standard preset", async () => {
  const config = shallowRef<PivotPanelProps["config"]>({
    rows: [],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  const change = vi.fn();
  mount(() =>
    h(PivotPanel, {
      config: config.value,
      fields: [
        { key: "team", label: "Team" },
        { key: "amount", label: "Amount" },
      ],
      onChange: change,
    })
  );
  await flush();
  const zone = element<HTMLElement>('[data-zone="rows"]');
  expect(zone.querySelector(".n-base-selection")).not.toBeNull();
  await pick(zone, "Team");
  expect(change).toHaveBeenCalledWith({
    rows: ["team"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  expect(config.value.rows).toEqual([]);
  for (const button of document.querySelectorAll(
    ".adapttable-naive-pivot button"
  ))
    expect(button.classList.contains("n-button")).toBe(true);
  stops.pop()?.();
  document.body.replaceChildren();
  const features = standardFeatures();
  mount(() =>
    h(DataTable<{ id: string; team: string }>, {
      data: [{ id: "a", team: "Core" }],
      columns: [{ key: "team" }],
      rowKey: (row: { id: string }) => row.id,
      urlSync: false,
      forceMobile: false,
      features,
    })
  );
  await flush();
  expect(element(part("column-menu-button")).tagName).toBe("BUTTON");
  expect(element(part("density-toggle")).getAttribute("role")).toBe("group");
});

it("moves, removes and re-aggregates configured pivot fields through Naive UI controls", async () => {
  const change = vi.fn();
  mount(() =>
    h(PivotPanel, {
      config: {
        rows: ["team", "status"],
        columns: [],
        measures: [{ key: "amount", agg: "sum" }],
      },
      fields: [
        { key: "team", label: "Team" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount" },
      ],
      onChange: change,
    })
  );
  await flush();
  const rows = element<HTMLElement>('[data-zone="rows"]');
  const buttons = [...rows.querySelectorAll<HTMLButtonElement>("button")];
  const labelled = (label: string) => {
    const found = buttons.find((button) =>
      button.getAttribute("aria-label")?.startsWith(label)
    );
    if (!found) throw new Error(`Missing ${label}`);
    return found;
  };
  expect(labelled("Move up").disabled).toBe(true);
  labelled("Move down").click();
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ rows: ["status", "team"] })
  );
  labelled("Remove").click();
  const calls = change.mock.calls.length;
  await pick(element<HTMLElement>('[data-zone="columns"]'), /^Add/);
  expect(change).toHaveBeenCalledTimes(calls);
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ rows: ["status"] })
  );
  await pick(element<HTMLElement>('[data-zone="measures"]'), /average|avg/i);
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ measures: [{ key: "amount", agg: "avg" }] })
  );
});

it("floats the assistant window and leaves an Escape an inner overlay handled alone", async () => {
  const changed = vi.fn();
  const assistant = (): TableAssistantProps["assistant"] => ({
    status: "ready",
    messages: [],
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [],
    runSuggestion: vi.fn(),
  });
  mount(() =>
    h(TableAssistant, {
      assistant: assistant(),
      open: true,
      onOpenChange: changed,
      presentation: "floating",
    })
  );
  await flush();
  const window = element(part("assistant-window"));
  expect(window.classList.contains("n-card")).toBe(true);
  expect(window.getAttribute("role")).toBe("region");
  stops.pop()?.();
  document.body.replaceChildren();
  mount(() =>
    h(TableAssistant, {
      assistant: assistant(),
      open: true,
      onOpenChange: changed,
      presentation: "sheet",
    })
  );
  await flush();
  const input = element<HTMLTextAreaElement>(part("assistant-input"));
  const handled = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  handled.preventDefault();
  input.dispatchEvent(handled);
  await flush();
  expect(changed).not.toHaveBeenCalled();
  const sheet = element(part("assistant-sheet"));
  expect(sheet).not.toBeNull();
  // An Escape on the drawer itself, outside the assistant surface, is the
  // sheet's own close request.
  await key(sheet, "Escape");
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
});

it("registers the approval feature through the kit's own component", () => {
  const feature = agentApproval();
  expect(feature.id).toBeTruthy();
  expect(feature.renders?.length ?? 0).toBeGreaterThan(0);
});
