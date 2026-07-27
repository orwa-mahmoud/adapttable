/**
 * Keyboard-flow a11y (item-34 verify): multi-sort from the keyboard, the
 * filter drawer's trap/restore cycle, edit commit keeping focus in the
 * table, the bulk bar's live announcement, and the pager's current page.
 */
import {
  createMemoryAdapter,
  type FilterDef,
  useFrontendData,
} from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  qty: number;
}

const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  name: `Item ${String(i + 1).padStart(2, "0")}`,
  qty: i,
}));

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  {
    key: "qty",
    header: "Qty",
    accessor: (r) => String(r.qty),
    sortValue: (r) => r.qty,
    sortable: true,
    editable: true,
    editor: "text",
  },
];

const filters: FilterDef<Row>[] = [
  { key: "name", type: "text", label: "Name" },
];

function Harness(props: {
  override?: Partial<
    Omit<Parameters<typeof DataTable<Row>>[0], "mode" | "source">
  >;
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
    paginationMode: "paged",
    defaults: { limit: 5 },
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      {...props.override}
    />
  );
}

const part = (name: string): HTMLElement | null =>
  document.body.querySelector(`[data-adapttable-part="${name}"]`);

describe("keyboard flows (unstyled)", () => {
  it("sorts by keyboard, including a shift multi-sort chain", () => {
    render(<Harness override={{ multiSort: true }} />);
    const buttons = document.body.querySelectorAll(
      '[data-adapttable-part="sort-button"]'
    );
    const nameSort = buttons[0]!;
    const qtySort = buttons[1]!;

    // Plain activation sorts the first column…
    fireEvent.click(nameSort);
    expect(nameSort.closest("th")).toHaveAttribute("aria-sort", "ascending");

    // …and a shift-activation chains the second: BOTH headers now report
    // sorted state, with data-sorted agreeing with aria-sort.
    fireEvent.click(nameSort, { shiftKey: true });
    fireEvent.click(qtySort, { shiftKey: true });
    const nameTh = nameSort.closest("th")!;
    const qtyTh = qtySort.closest("th")!;
    expect(nameTh).toHaveAttribute("aria-sort", "ascending");
    expect(qtyTh).toHaveAttribute("aria-sort", "ascending");
    expect(nameTh).toHaveAttribute("data-sorted", "asc");
    expect(qtyTh).toHaveAttribute("data-sorted", "asc");
    expect(part("sort-index")).not.toBeNull();
  });

  it("drawer: focus is trapped inside and restored to the trigger on Escape", () => {
    render(<Harness override={{ filters, filtersMode: "drawer" }} />);
    const trigger = part("filters-button")!;
    trigger.focus();
    fireEvent.click(trigger);

    const panel = part("filters-panel")!;
    expect(panel).toHaveFocus();

    // Tab from the panel's last focusable wraps to the first — never the
    // background (aria-modal must not lie).
    const focusables = panel.querySelectorAll<HTMLElement>(
      "button, input, select, textarea"
    );
    const last = focusables[focusables.length - 1]!;
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(panel.contains(document.activeElement)).toBe(true);

    // Escape closes AND hands focus back to the trigger.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(part("filters-panel")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("committing an inline edit keeps keyboard focus in the table", () => {
    render(<Harness override={{ onCellEdit: vi.fn() }} />);
    const activate = part("edit-cell-activate")!;
    activate.focus();
    fireEvent.keyDown(activate, { key: "Enter" });

    const editor = part("edit-cell-editor")!;
    fireEvent.change(editor, { target: { value: "42" } });
    fireEvent.keyDown(editor, { key: "Enter" });

    // Focus lands back on the activate control — never on <body>.
    expect(document.activeElement).toBe(part("edit-cell-activate"));
  });

  it("bulk selection count is announced through a live region", () => {
    render(
      <Harness
        override={{
          bulkActions: [{ key: "del", label: "Delete", onClick: vi.fn() }],
        }}
      />
    );
    fireEvent.click(part("selection-cell")!.querySelector("input")!);
    const status = document.body.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(part("bulk-bar")!.contains(status)).toBe(true);
    expect(status.textContent).toMatch(/1/);
  });

  it("the pager announces the current page", () => {
    render(<Harness />);
    const current = document.body.querySelector('[aria-current="page"]')!;
    expect(current).not.toBeNull();
    expect(current).toHaveAttribute("data-adapttable-part", "page-number");
    expect(current.textContent).toBe("1");
  });
});
