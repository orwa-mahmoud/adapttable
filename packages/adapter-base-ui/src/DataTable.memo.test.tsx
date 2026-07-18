/**
 * Desktop row memoization acceptance: unchanged rows must NOT re-render
 * (their accessors must not be re-invoked) when unrelated table state
 * changes — a search keystroke, a hover, or another row's selection.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];

// The probe: every desktop row render invokes this once for the Name cell.
const accessor = vi.fn((r: Row) => r.name);
// Module-level so the columns identity is stable across re-renders — an
// inline `columns` array would defeat the row memo by design.
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

function mount(override: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const adapter = createMemoryAdapter("");
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      adapter,
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...override}
      />
    );
  }
  return render(<Harness />);
}

describe("<DataTable> (Base UI) desktop row memoization", () => {
  it("does not re-invoke accessors for unchanged rows on a search keystroke", () => {
    mount();
    expect(accessor).toHaveBeenCalled();
    accessor.mockClear();
    // A keystroke re-renders the whole table (controlled input state), but
    // no row's visual inputs changed — the memo must skip every row. The
    // debounce hasn't elapsed, so the rows themselves are untouched.
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "ali" },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(accessor).not.toHaveBeenCalled();
  });

  it("does not re-invoke accessors when hovering a row without prefetch", () => {
    mount();
    accessor.mockClear();
    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(accessor).not.toHaveBeenCalled();
  });

  it("re-renders only the toggled row on a single-row selection change", () => {
    mount({ bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] });
    accessor.mockClear();
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    // Row "a" re-rendered (its selected state changed); row "b" did not.
    const renderedIds = accessor.mock.calls.map(([row]) => row.id);
    expect(renderedIds.length).toBeGreaterThan(0);
    expect(new Set(renderedIds)).toEqual(new Set(["a"]));
  });

  it("re-renders only the toggled row when expanding a detail panel", () => {
    mount({ renderRowDetail: (row) => <div>detail-{row.name}</div> });
    accessor.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    const renderedIds = accessor.mock.calls.map(([row]) => row.id);
    expect(new Set(renderedIds)).toEqual(new Set(["a"]));
  });

  it("still updates rows when their data actually changes (memo is not stale)", () => {
    mount();
    // First click sorts ascending — already the rendered order, so the memo
    // may legitimately skip. The second click flips to descending: indexes
    // and row identities change, so the rows MUST re-render.
    fireEvent.click(screen.getByRole("button", { name: /sort by: name/i }));
    accessor.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /sort by: name/i }));
    expect(accessor).toHaveBeenCalled();
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells.indexOf("Bob")).toBeLessThan(cells.indexOf("Alice"));
  });
});
