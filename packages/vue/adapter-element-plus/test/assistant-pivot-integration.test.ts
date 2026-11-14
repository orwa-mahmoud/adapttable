import { afterEach, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { TableAssistant, type TableAssistantProps } from "../src/assistant";
import { PivotPanel, type PivotPanelProps } from "../src/pivot";
import { standardFeatures } from "../src/preset";
import { mount as mountApp } from "./mount";

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
function mount(render: () => ReturnType<typeof h>) {
  const view = mountApp(render);
  stops.push(view.unmount);
  return view.root;
}
it("uses a real ElDrawer with one close request, nested dropdown Escape and controlled draft ownership", async () => {
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
it("uses Element Plus selects for controlled pivot configuration and mounts the complete standard preset", async () => {
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
  expect(zone.querySelector(".el-select")).not.toBeNull();
  const input = element<HTMLInputElement>(
    '[data-zone="rows"] input[role="combobox"]'
  );
  input.click();
  await flush();
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === "Team");
  if (!option) throw new Error("Missing Team");
  option.click();
  await flush();
  expect(change).toHaveBeenCalledWith({
    rows: ["team"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  expect(config.value.rows).toEqual([]);
  for (const button of document.querySelectorAll(
    ".adapttable-element-plus-pivot button"
  ))
    expect(button.classList.contains("el-button")).toBe(true);
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
  expect(element(part("density-toggle")).getAttribute("role")).toBe(
    "radiogroup"
  );
});

it("moves, removes and re-aggregates configured pivot fields through Element Plus controls", async () => {
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
  const add = element<HTMLElement>('[data-zone="columns"] .el-select');
  add.querySelector<HTMLInputElement>('input[role="combobox"]')?.click();
  await flush();
  const calls = change.mock.calls.length;
  const placeholder = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim().startsWith("Add"));
  placeholder?.click();
  await flush();
  expect(change).toHaveBeenCalledTimes(calls);
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ rows: ["status"] })
  );
  const aggregation = element<HTMLElement>('[data-zone="measures"] .el-select');
  aggregation
    .querySelector<HTMLInputElement>('input[role="combobox"]')
    ?.click();
  await flush();
  const average = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => /average|avg/i.test(item.textContent ?? ""));
  if (!average) throw new Error("Missing the average aggregation");
  average.click();
  await flush();
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
  expect(window.classList.contains("el-card")).toBe(true);
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
