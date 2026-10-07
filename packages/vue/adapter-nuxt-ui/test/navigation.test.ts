import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { editing } from "../src/editing";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", score: 10 },
  { id: "g", name: "Grace", score: 30 },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0).reverse()) stop();
});
function mount(overrides: Partial<DataTableProps<Row>> = {}) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "score", header: "Score", editable: true, editor: "number" },
    ],
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features: [
      cellNavigation(),
      columnSelectionCheckbox(),
      findInTable({ button: true }),
      selectionStats(),
      statusBar(),
    ],
    ...overrides,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({ setup: () => () => h(DataTable<Row>, props.value) })
  );
  app.use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props };
}
function element<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function key(
  target: HTMLElement,
  key: string,
  options: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  await nextTick();
  await nextTick();
  return event;
}
describe("genuine Nuxt grid controls", () => {
  it("moves focus, extends the core range, selects columns, and shows one combined status strip", async () => {
    const range = vi.fn();
    const { root } = mount({
      features: [
        cellNavigation({ onRangeChange: range }),
        columnSelectionCheckbox(),
        selectionStats(),
        statusBar(),
      ],
    });
    await nextTick();
    await nextTick();
    const first = element(root, '[data-grid-cell="0:0"]');
    first.focus();
    await key(first, "ArrowRight");
    expect(document.activeElement).toBe(
      element(root, '[data-grid-cell="0:1"]')
    );
    await key(element(root, '[data-grid-cell="0:1"]'), "ArrowDown", {
      shiftKey: true,
    });
    expect(range).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 1 },
      head: { row: 1, col: 1 },
    });
    expect(root.querySelectorAll(part("status-bar"))).toHaveLength(1);
    expect(element(root, part("selection-stats")).textContent).toContain("40");
    const checkbox = element<HTMLButtonElement>(
      root,
      'button[role="checkbox"][aria-label="Select column: Name"]'
    );
    checkbox.click();
    await nextTick();
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(root.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
    checkbox.click();
    await nextTick();
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(
      element(root, part("grid-announcer")).getAttribute("aria-live")
    ).toBe("polite");
  });
  it("finds with a toolbar button, walks hits, preserves editor keys and removes models live", async () => {
    const { root, props } = mount();
    await nextTick();
    await nextTick();
    element<HTMLButtonElement>(root, part("find-button")).click();
    await nextTick();
    await nextTick();
    const input = element<HTMLInputElement>(root, part("find-input"));
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(2);
    expect(element(root, part("find-count")).textContent).toContain("1 of 2");
    await key(input, "Enter");
    expect(element(root, part("find-count")).textContent).toContain("2 of 2");
    await key(input, "Enter", { shiftKey: true });
    expect(element(root, part("find-count")).textContent).toContain("1 of 2");
    await key(input, "Escape");
    expect(root.querySelector(part("find-bar"))).toBeNull();
    props.value = { ...props.value, features: [] };
    await nextTick();
    await nextTick();
    expect(root.querySelector('[role="grid"]')).toBeNull();
    expect(root.querySelector(part("status-bar"))).toBeNull();
  });
  it("scopes Ctrl+F independently of grid navigation and marks mobile cells", async () => {
    const { root } = mount({ forceMobile: true, features: [findInTable()] });
    await nextTick();
    await nextTick();
    const cell = element(root, part("card-value"));
    cell.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    const open = await key(document.body, "f", { ctrlKey: true });
    expect(open.defaultPrevented).toBe(true);
    const input = element<HTMLInputElement>(root, part("find-input"));
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(1);
    expect(root.querySelector('[role="grid"]')).toBeNull();
  });
  it("opens inline editing on F2 and leaves editor arrows and clipboard keys alone", async () => {
    const commit = vi.fn();
    const { root } = mount({
      features: [cellNavigation(), editing<Row>(commit)],
    });
    await nextTick();
    await nextTick();
    const cell = element(root, '[data-grid-cell="0:1"]');
    cell.focus();
    await key(cell, "F2");
    const input = element<HTMLInputElement>(root, part("edit-cell-editor"));
    expect((await key(input, "ArrowLeft")).defaultPrevented).toBe(false);
    expect((await key(input, "c", { ctrlKey: true })).defaultPrevented).toBe(
      false
    );
  });
  it("mirrors horizontal keys for RTL and offers fill only with a host callback", async () => {
    const fill = vi.fn();
    const { root } = mount({
      dir: "rtl",
      onCellFill: fill,
      features: [cellNavigation()],
    });
    await nextTick();
    await nextTick();
    const first = element(root, '[data-grid-cell="0:0"]');
    first.focus();
    await key(first, "ArrowLeft");
    const cell = element(root, '[data-grid-cell="0:1"]');
    expect(document.activeElement).toBe(cell);
    await key(cell, "ArrowDown", { shiftKey: true });
    expect(root.querySelector(part("fill-handle"))).not.toBeNull();
    await key(element(root, '[data-grid-cell="1:1"]'), "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledWith([
      { row: rows[1], columnKey: "score", value: "10" },
    ]);
  });
});
it("keeps typing in the find input and restores focus when its bar closes", async () => {
  const { root } = mount();
  await nextTick();
  await nextTick();
  const trigger = element<HTMLButtonElement>(root, part("find-button"));
  trigger.focus();
  trigger.click();
  await nextTick();
  await nextTick();
  await nextTick();
  await nextTick();
  const input = element<HTMLInputElement>(root, part("find-input"));
  expect(document.activeElement).toBe(input);
  for (const query of ["a", "ad"]) {
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(input);
  }
  await key(input, "Escape");
  await nextTick();
  await nextTick();
  expect(document.activeElement).not.toBe(document.body);
});

it("keeps host fill writes as requests and exposes all status markers and classes", async () => {
  const fill = vi.fn();
  const { root } = mount({
    onCellFill: fill,
    classNames: {
      statusBar: "status-paint",
      statusItem: "item-paint",
      selectionStats: "stats-paint",
      findInput: "find-paint",
      findButton: "find-action-paint",
    },
  });
  await nextTick();
  await nextTick();
  const first = element(root, '[data-grid-cell="0:1"]');
  first.focus();
  await key(first, "ArrowDown", { shiftKey: true });
  await key(element(root, '[data-grid-cell="1:1"]'), "d", { ctrlKey: true });
  expect(fill).toHaveBeenCalledExactlyOnceWith([
    { row: rows[1], columnKey: "score", value: "10" },
  ]);
  expect(element(root, '[data-grid-cell="1:1"]').textContent).toContain("30");
  expect(
    element(root, part("status-bar")).classList.contains("status-paint")
  ).toBe(true);
  expect(
    element(root, part("status-item")).classList.contains("item-paint")
  ).toBe(true);
  const stats = element(root, part("selection-stats"));
  expect(stats.classList.contains("stats-paint")).toBe(true);
  expect(stats.getAttribute("aria-live")).toBe("polite");
  expect(stats.querySelectorAll(part("selection-stat")).length).toBeGreaterThan(
    1
  );
  element<HTMLButtonElement>(root, part("find-button")).click();
  await nextTick();
  await nextTick();
  expect(
    element(root, part("find-input")).classList.contains("find-paint")
  ).toBe(true);
  expect(
    element(root, part("find-next")).classList.contains("find-action-paint")
  ).toBe(true);
  expect(element(root, part("find-next")).getAttribute("data-slot")).toBe(
    "base"
  );
});

it("renders status without navigation and retires an open Find feature live", async () => {
  const { root, props } = mount({
    forceMobile: true,
    features: [statusBar(), findInTable({ button: true })],
  });
  await nextTick();
  await nextTick();
  expect(root.querySelector('[role="grid"]')).toBeNull();
  expect(root.querySelector(part("column-select"))).toBeNull();
  expect(root.querySelector(part("fill-handle"))).toBeNull();
  expect(root.querySelectorAll(part("status-bar"))).toHaveLength(1);
  const trigger = element<HTMLButtonElement>(root, part("find-button"));
  trigger.click();
  await nextTick();
  await nextTick();
  const input = element<HTMLInputElement>(root, part("find-input"));
  props.value = { ...props.value, features: [] };
  await nextTick();
  await nextTick();
  input.value = "Ada";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  trigger.click();
  await nextTick();
  await nextTick();
  expect(root.querySelector(part("find-bar"))).toBeNull();
  expect(root.querySelector(part("status-bar"))).toBeNull();
  expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(0);
});
