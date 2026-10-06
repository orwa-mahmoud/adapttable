import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable, type DataTableProps } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";

interface Row {
  id: string;
  name: string;
  score: number;
}
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
function mount(extra: Partial<DataTableProps<Row>> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [
          { id: "a", name: "Ada", score: 10 },
          { id: "b", name: "Bea", score: 30 },
        ],
        columns: [
          { key: "name", header: "Name" },
          { key: "score", header: "Score" },
        ],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [
          cellNavigation(),
          columnSelectionCheckbox(),
          selectionStats(),
          statusBar(),
          findInTable({ button: true }),
        ],
        classNames: {
          findInput: "consumer-find-input",
          findButton: "consumer-find-button",
          statusBar: "consumer-status",
        },
        ...extra,
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
const part = (value: string) => `[data-adapttable-part="${value}"]`;
function element<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const target = root.querySelector<T>(selector);
  if (!target) throw new Error(`Missing ${selector}`);
  return target;
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await nextTick();
}
async function key(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await flush();
}
it("uses shared keyboard ranges and genuine Reka column checkboxes with one statistics strip", async () => {
  const range = vi.fn();
  const host = mount({
    onCellFill: vi.fn(),
    features: [
      cellNavigation({ onRangeChange: range }),
      columnSelectionCheckbox(),
      selectionStats(),
      statusBar(),
    ],
  });
  await flush();
  const name = element(host, '[data-grid-cell="0:0"]');
  const score = element(host, '[data-grid-cell="0:1"]');
  name.focus();
  await key(name, "ArrowRight");
  expect(document.activeElement).toBe(score);
  await key(score, "ArrowDown", { shiftKey: true });
  expect(range).toHaveBeenLastCalledWith({
    anchor: { row: 0, col: 1 },
    head: { row: 1, col: 1 },
  });
  expect(host.querySelectorAll(part("status-bar"))).toHaveLength(1);
  const handle = element(host, part("fill-handle"));
  expect(handle.classList.contains("at-reka-fill-handle")).toBe(true);
  expect(handle.getAttribute("title")).toBeTruthy();
  expect(element(host, part("selection-stats")).textContent).toContain("40");
  const checkbox = element(
    host,
    '[role="checkbox"][aria-label="Select column: Name"]'
  );
  checkbox.click();
  await flush();
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
  expect(
    host.querySelectorAll('[data-grid-cell][aria-selected="true"]')
  ).toHaveLength(2);
  checkbox.click();
  await flush();
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  expect(
    element(host, part("status-bar")).classList.contains("consumer-status")
  ).toBe(true);
});
it("opens and dismisses the binding find controller through styled native Reka inputs", async () => {
  const host = mount();
  await flush();
  const trigger = element(host, part("find-button"));
  trigger.focus();
  trigger.click();
  await flush();
  const input = element<HTMLInputElement>(host, part("find-input"));
  expect(document.activeElement).toBe(input);
  expect(input.classList.contains("consumer-find-input")).toBe(true);
  input.value = "Ada";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(element(host, part("find-count")).textContent).toContain("1");
  expect(document.activeElement).toBe(input);
  expect(
    element(host, part("find-close")).classList.contains("consumer-find-button")
  ).toBe(true);
  await key(input, "Escape");
  expect(host.querySelector(part("find-bar"))).toBeNull();
  expect(document.activeElement).toBe(element(host, '[data-grid-cell="0:0"]'));
});
it("reverses horizontal navigation in RTL and keeps mobile out of grid mode", async () => {
  const rtl = mount({ dir: "rtl" });
  await flush();
  const first = element(rtl, '[data-grid-cell="0:0"]');
  first.focus();
  await key(first, "ArrowLeft");
  expect(document.activeElement).toBe(element(rtl, '[data-grid-cell="0:1"]'));
  const mobile = mount({ forceMobile: true });
  await flush();
  expect(mobile.querySelector('[role="grid"]')).toBeNull();
  expect(mobile.textContent).toContain("Ada");
});
