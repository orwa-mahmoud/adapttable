import "./filter-helpers";

import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { columnSelectionCheckbox } from "../src/column-selection";
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
  vi.restoreAllMocks();
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
  return event;
}
describe("Naive grid controls", () => {
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
    const checkbox = element<HTMLElement>(
      root,
      '[role="checkbox"][aria-label="Select column: Name"]'
    );
    checkbox.click();
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(root.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
    checkbox.click();
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(
      element(root, part("grid-announcer")).getAttribute("aria-live")
    ).toBe("polite");
  });
  it("finds with a toolbar button, walks hits, preserves editor keys and removes models live", async () => {
    const { root, props } = mount();
    await nextTick();
    element<HTMLButtonElement>(root, part("find-button")).click();
    await nextTick();
    const input = element<HTMLInputElement>(root, part("find-input"));
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
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
    expect(root.querySelector('[role="grid"]')).toBeNull();
    expect(root.querySelector(part("status-bar"))).toBeNull();
  });
  it("scopes Ctrl+F independently of grid navigation and marks mobile cells", async () => {
    const { root } = mount({ forceMobile: true, features: [findInTable()] });
    await nextTick();
    const cell = element(root, part("card-value"));
    cell.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    const open = await key(document.body, "f", { ctrlKey: true });
    expect(open.defaultPrevented).toBe(true);
    const input = element<HTMLInputElement>(root, part("find-input"));
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
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
