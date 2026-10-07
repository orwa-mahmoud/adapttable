import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";

import { DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { editing } from "../src/editing";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";
import {
  find,
  key,
  mountFeatures,
  original,
  part,
  type Row,
  tick,
  write,
} from "./feature-helpers";

const rows = [original, { ...original, id: "g", name: "Grace", amount: 8 }];
const columns = [
  { key: "name", header: "Name" },
  { key: "amount", header: "Amount", editable: true, editor: "number" },
] as const;
async function press(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  await tick();
  return event;
}

describe("shadcn navigation presentations", () => {
  it("fills real column checkboxes and a single combined status Card from the binding range", async () => {
    const range = vi.fn();
    const { root } = mountFeatures(
      [
        cellNavigation({ onRangeChange: range }),
        columnSelectionCheckbox(),
        statusBar(),
        selectionStats(),
      ],
      { data: rows }
    );
    await tick();
    const first = find<HTMLElement>(root, '[data-grid-cell="0:0"]');
    first.focus();
    await press(first, "ArrowRight");
    const amount = find<HTMLElement>(root, '[data-grid-cell="0:1"]');
    expect(document.activeElement).toBe(amount);
    await press(amount, "ArrowDown", { shiftKey: true });
    expect(range).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 1 },
      head: { row: 1, col: 1 },
    });
    expect(root.querySelectorAll(part("status-bar"))).toHaveLength(1);
    expect(find(root, part("status-bar")).tagName).toBe("FOOTER");
    expect(find(root, part("status-bar")).getAttribute("data-slot")).toBe(
      "card"
    );
    expect(find(root, part("selection-stats")).textContent).toContain("10");
    expect(find(root, part("selection-stats")).getAttribute("aria-live")).toBe(
      "polite"
    );
    const checkbox = find<HTMLButtonElement>(
      root,
      'button[role="checkbox"][aria-label="Select column: Name"]'
    );
    expect(checkbox.getAttribute("data-slot")).toBe("checkbox");
    checkbox.click();
    await tick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(
      root.querySelectorAll('[data-grid-cell][aria-selected="true"]')
    ).toHaveLength(2);
    checkbox.click();
    await tick();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("keeps find typing focused, walks hits and returns focus to the binding-selected grid cell on Escape", async () => {
    const { root } = mountFeatures(
      [cellNavigation(), findInTable({ button: true })],
      { data: rows }
    );
    await tick();
    const trigger = find<HTMLButtonElement>(root, part("find-button"));
    trigger.focus();
    trigger.click();
    await tick();
    const input = find<HTMLInputElement>(root, part("find-input"));
    expect(input.getAttribute("data-slot")).toBe("input");
    expect(document.activeElement).toBe(input);
    await write(input, "a");
    expect(document.activeElement).toBe(input);
    expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(2);
    expect(find(root, part("find-count")).textContent).toContain("1 of 2");
    await press(input, "Enter");
    expect(find(root, part("find-count")).textContent).toContain("2 of 2");
    await press(input, "Enter", { shiftKey: true });
    expect(find(root, part("find-count")).textContent).toContain("1 of 2");
    await press(input, "Escape");
    expect(root.querySelector(part("find-bar"))).toBeNull();
    // Closing find lets the authoritative grid controller restore its active cell.
    expect(document.activeElement).toBe(find(root, '[data-grid-cell="0:0"]'));
    trigger.click();
    await tick();
    expect(document.activeElement).toBe(find(root, part("find-input")));
  });

  it("mirrors live RTL navigation and leaves fill writes to the host", async () => {
    const fill = vi.fn();
    const { root, props } = mountFeatures([cellNavigation()], {
      data: rows,
      onCellFill: fill,
    });
    await tick();
    props.value = { ...props.value, dir: "rtl" };
    await tick();
    const first = find<HTMLElement>(root, '[data-grid-cell="0:0"]');
    first.focus();
    await press(first, "ArrowLeft");
    const amount = find<HTMLElement>(root, '[data-grid-cell="0:1"]');
    expect(document.activeElement).toBe(amount);
    await press(amount, "ArrowDown", { shiftKey: true });
    const handle = find(root, part("fill-handle"));
    expect(handle.getAttribute("data-slot")).toBe("button");
    expect(handle.tagName).toBe("SPAN");
    expect(handle.hasAttribute("type")).toBe(false);
    expect(handle.getAttribute("aria-hidden")).toBe("true");
    await press(find(root, '[data-grid-cell="1:1"]'), "d", { ctrlKey: true });
    expect(fill).toHaveBeenCalledExactlyOnceWith([
      { row: rows[1], columnKey: "amount", value: "2" },
    ]);
    expect(root.textContent).toContain("8");
  });

  it("does not expose a fill action without a host callback", async () => {
    const { root } = mountFeatures([cellNavigation()], { data: rows });
    await tick();
    const first = find<HTMLElement>(root, '[data-grid-cell="0:0"]');
    first.focus();
    await press(first, "ArrowDown", { shiftKey: true });
    expect(root.querySelector(part("fill-handle"))).toBeNull();
  });

  it("scopes mobile find to the active table and removes optional controls live", async () => {
    const { root, props } = mountFeatures([findInTable(), statusBar()], {
      data: rows,
      forceMobile: true,
    });
    await tick();
    find(root, part("card-value")).dispatchEvent(
      new Event("pointerdown", { bubbles: true })
    );
    expect(
      (await press(document.body, "f", { ctrlKey: true })).defaultPrevented
    ).toBe(true);
    const input = find<HTMLInputElement>(root, part("find-input"));
    await write(input, "Ada");
    expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(1);
    expect(root.querySelector('[role="grid"]')).toBeNull();
    props.value = { ...props.value, features: [] };
    await tick();
    expect(root.querySelector(part("find-bar"))).toBeNull();
    expect(root.querySelector(part("status-bar"))).toBeNull();
  });

  it("keeps editor arrow and clipboard keys outside the grid keyboard handler", async () => {
    const commit = vi.fn();
    const { root } = mountFeatures([cellNavigation(), editing<Row>(commit)]);
    await tick();
    const cell = find<HTMLElement>(root, '[data-grid-cell="0:1"]');
    cell.focus();
    await press(cell, "F2");
    const input = find<HTMLInputElement>(root, part("edit-cell-editor"));
    expect((await press(input, "ArrowLeft")).defaultPrevented).toBe(false);
    expect((await press(input, "c", { ctrlKey: true })).defaultPrevented).toBe(
      false
    );
    key(input, "Escape");
    await tick();
    expect(commit).not.toHaveBeenCalled();
  });

  it("renders deterministic navigation/status SSR and isolates disabled presentations", async () => {
    const render = (enabled: boolean) =>
      renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Row>, {
              data: rows,
              columns,
              rowKey: (row) => row.id,
              urlSync: false,
              searchable: false,
              forceMobile: false,
              features: enabled
                ? [
                    cellNavigation(),
                    columnSelectionCheckbox(),
                    findInTable({ button: true }),
                    statusBar(),
                    selectionStats(),
                  ]
                : [],
            }),
        })
      );
    const first = await render(true);
    expect(first).toBe(await render(true));
    expect(first).toContain('data-adapttable-part="find-button"');
    // Grid navigation is passive before mount; SSR retains semantic table cells.
    expect(first).toContain('role="table"');
    expect(first).not.toContain('data-adapttable-part="column-select"');
    expect(first).not.toContain('data-adapttable-part="find-input"');
    const disabled = await render(false);
    expect(disabled).not.toContain('data-adapttable-part="status-bar"');
    expect(disabled).not.toContain('data-adapttable-part="column-select"');
  });
});
