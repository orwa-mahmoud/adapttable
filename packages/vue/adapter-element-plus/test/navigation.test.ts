import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref, shallowRef } from "vue";

import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { cellSpan } from "../src/cell-span";
import DataTable from "../src/DataTable.vue";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: Row[] = [
  { id: "a", name: "Ada", score: 10 },
  { id: "g", name: "Grace", score: 30 },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const cell = (row: number, col: number) => `[data-grid-cell="${row}:${col}"]`;
async function tick() {
  await nextTick();
  await nextTick();
}
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
  await tick();
  return event;
}
function fixture(extra: Partial<DataTableProps<Row>> = {}) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "score", header: "Score", editable: true, editor: "number" },
    ],
    rowKey: (row) => row.id,
    forceMobile: false,
    urlSync: false,
    searchable: false,
    features: [
      cellNavigation(),
      columnSelectionCheckbox(),
      statusBar(),
      selectionStats(),
    ],
    classNames: {
      statusBar: "host-status",
      statusItem: "host-item",
      selectionStats: "host-stats",
    },
    ...extra,
  });
  return { ...mount(() => h(DataTable<Row>, props.value)), props };
}
describe("Element Plus grid navigation and status", () => {
  it("moves native grid focus and announces one localized statistics strip from the binding range", async () => {
    const changed = vi.fn();
    const { root } = fixture({
      features: [
        cellNavigation({ onRangeChange: changed }),
        statusBar(),
        selectionStats(),
      ],
    });
    await tick();
    const first = node<HTMLElement>(root, cell(0, 0));
    first.focus();
    await key(first, "ArrowRight");
    const score = node<HTMLElement>(root, cell(0, 1));
    expect(document.activeElement).toBe(score);
    await key(score, "ArrowDown", { shiftKey: true });
    expect(changed).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 1 },
      head: { row: 1, col: 1 },
    });
    expect(node(root, cell(0, 0))).toBe(first);
    expect(root.querySelectorAll(part("status-bar"))).toHaveLength(1);
    expect(
      node(root, part("status-bar")).classList.contains("host-status")
    ).toBe(true);
    const stat = node<HTMLOutputElement>(root, part("selection-stats"));
    expect(stat.tagName).toBe("OUTPUT");
    expect(stat.getAttribute("aria-live")).toBe("polite");
    expect(stat.getAttribute("aria-atomic")).toBe("true");
    expect(stat.classList.contains("host-stats")).toBe(true);
    expect(stat.textContent).toContain("40");
    expect(
      node(stat, part("selection-stat")).classList.contains("el-text")
    ).toBe(true);
    expect(node(root, part("status-item")).classList.contains("el-text")).toBe(
      true
    );
    expect(
      node(root, part("status-item")).classList.contains("host-item")
    ).toBe(true);
    expect(node(root, part("grid-announcer")).getAttribute("aria-live")).toBe(
      "polite"
    );
  });
  it("uses genuine column checkboxes without sorting and preserves native label association and checked state", async () => {
    const { root } = fixture();
    await tick();
    const control = node<HTMLElement>(root, part("column-select"));
    const input = node<HTMLInputElement>(control, 'input[type="checkbox"]');
    const label = node<HTMLLabelElement>(control, "label.el-checkbox");
    expect(label.control).toBe(input);
    expect(label.textContent).toContain("Select column: Name");
    input.focus();
    input.click();
    await tick();
    expect(input.checked).toBe(true);
    expect(document.activeElement).toBe(node(root, cell(0, 0)));
    expect(root.querySelectorAll('td[aria-selected="true"]')).toHaveLength(2);
    expect(root.querySelector('[aria-sort="ascending"]')).toBeNull();
    input.click();
    await tick();
    expect(input.checked).toBe(false);
    expect(root.querySelectorAll('td[aria-selected="true"]')).toHaveLength(0);
    expect(node(control, 'input[type="checkbox"]')).toBe(input);
  });
  it("mirrors RTL arrows and requests a fill once without changing host rows", async () => {
    const fill = vi.fn();
    const { root } = fixture({
      dir: "rtl",
      onCellFill: fill,
      features: [cellNavigation()],
    });
    await tick();
    const first = node<HTMLElement>(root, cell(0, 0));
    first.focus();
    await key(first, "ArrowLeft");
    const score = node<HTMLElement>(root, cell(0, 1));
    expect(document.activeElement).toBe(score);
    await key(score, "ArrowDown", { shiftKey: true });
    const handle = node<HTMLElement>(root, part("fill-handle"));
    expect(handle.tagName).toBe("SPAN");
    expect(handle.getAttribute("aria-hidden")).toBe("true");
    expect(handle.style.background).toBe("var(--el-color-primary)");
    expect(handle.style.insetInlineEnd).toBe("-3px");
    expect(handle.tabIndex).toBe(-1);
    await key(node<HTMLElement>(root, cell(1, 1)), "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledExactlyOnceWith([
      { row: rows[1], columnKey: "score", value: "10" },
    ]);
    expect(rows[1]?.score).toBe(30);
    expect(node(root, cell(1, 1)).textContent).toContain("30");
  });
  it("omits fill controls without a host write callback and retires grid controls when removed", async () => {
    const changed = vi.fn();
    const { root, props } = fixture({
      features: [
        cellNavigation({ onRangeChange: changed }),
        columnSelectionCheckbox(),
        selectionStats(),
      ],
    });
    await tick();
    const first = node<HTMLElement>(root, cell(0, 0));
    first.focus();
    await key(first, "ArrowDown", { shiftKey: true });
    expect(root.querySelector(part("fill-handle"))).toBeNull();
    const count = changed.mock.calls.length;
    props.value = { ...props.value, features: [] };
    await tick();
    expect(root.querySelector('[role="grid"]')).toBeNull();
    expect(root.querySelector(part("column-select"))).toBeNull();
    expect(root.querySelector(part("selection-stats"))).toBeNull();
    await key(first, "ArrowDown");
    expect(changed).toHaveBeenCalledTimes(count);
  });
  it("keeps Find text editing while the binding reveals the matching grid cell", async () => {
    const { root } = fixture({
      features: [
        cellNavigation(),
        findInTable({ button: true }),
        selectionStats(),
      ],
    });
    await tick();
    node<HTMLButtonElement>(root, part("find-button")).click();
    await tick();
    const input = node<HTMLInputElement>(root, part("find-input"));
    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(input);
    expect(root.querySelectorAll("[data-cell-match-current]")).toHaveLength(1);
    expect(node(root, "[data-cell-match-current]").textContent).toContain(
      "Grace"
    );
    expect((await key(input, "ArrowLeft")).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });
  it("uses a kit status strip on mobile without exposing desktop grid or fill gestures", async () => {
    const fill = vi.fn();
    const { root } = fixture({ forceMobile: true, onCellFill: fill });
    await tick();
    expect(root.querySelector('[role="grid"]')).toBeNull();
    expect(root.querySelector(part("column-select"))).toBeNull();
    expect(root.querySelector(part("fill-handle"))).toBeNull();
    expect(node(root, part("status-item")).classList.contains("el-text")).toBe(
      true
    );
    expect(root.querySelectorAll(part("card"))).toHaveLength(2);
    expect(fill).not.toHaveBeenCalled();
  });
  it("suspends cached grid handlers and revokes a retained fill target before reactivation", async () => {
    const active = ref(true);
    const fill = vi.fn();
    const view = mount(() =>
      h(KeepAlive, null, {
        default: () =>
          active.value
            ? h(DataTable<Row>, {
                data: rows,
                columns: [{ key: "score", editable: true, editor: "number" }],
                rowKey: (row) => row.id,
                forceMobile: false,
                searchable: false,
                urlSync: false,
                onCellFill: fill,
                features: [cellNavigation()],
              })
            : h("span"),
      })
    );
    await tick();
    const first = node<HTMLElement>(view.root, cell(0, 0));
    first.focus();
    await key(first, "ArrowDown", { shiftKey: true });
    const last = node<HTMLElement>(view.root, cell(1, 0));
    await key(last, "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledExactlyOnceWith([
      { row: rows[1], columnKey: "score", value: "10" },
    ]);
    active.value = false;
    await tick();
    await key(last, "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledTimes(1);
    active.value = true;
    await tick();
    expect(node(view.root, cell(0, 0))).toBe(first);
    expect(node(view.root, cell(1, 0)).textContent).toContain("30");
    view.unmount();
    await key(last, "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledTimes(1);
  });
  it("computes visible-column statistics after a host hides another column", async () => {
    const { root } = fixture({
      defaultColumnLayout: { hidden: ["name"] },
      features: [cellNavigation(), columnSelectionCheckbox(), selectionStats()],
    });
    await tick();
    expect(root.querySelector('td[data-column-key="name"]')).toBeNull();
    const first = node<HTMLElement>(root, cell(0, 0));
    expect(first.getAttribute("data-column-key")).toBe("score");
    first.focus();
    await key(first, "ArrowDown", { shiftKey: true });
    expect(node(root, part("selection-stats")).textContent).toContain("40");
    expect(root.querySelectorAll(part("column-select"))).toHaveLength(1);
  });
  it("keeps native cell spans and never focuses a covered grid coordinate", async () => {
    const { root } = fixture({
      features: [
        cellNavigation(),
        cellSpan<Row>(({ row, column }) =>
          row.id === "a" && column.key === "name" ? { colSpan: 2 } : undefined
        ),
      ],
    });
    await tick();
    const first = node<HTMLTableCellElement>(root, cell(0, 0));
    expect(first.colSpan).toBe(2);
    expect(root.querySelector(cell(0, 1))).toBeNull();
    first.focus();
    await key(first, "ArrowRight");
    expect(document.activeElement).toBe(first);
    await key(first, "ArrowDown");
    expect(document.activeElement).toBe(node(root, cell(1, 0)));
    await key(node<HTMLElement>(root, cell(1, 0)), "ArrowRight");
    expect(document.activeElement).toBe(node(root, cell(1, 1)));
  });
});
