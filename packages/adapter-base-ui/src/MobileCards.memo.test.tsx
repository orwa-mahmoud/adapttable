/**
 * Mobile card memoization + summary aggregation acceptance: unchanged cards
 * must NOT re-render on unrelated table state changes, and the `summaryRow`
 * aggregate must run only when its input rows change.
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
  { id: "c", name: "Cara", city: "Doha" },
];

// One spy accessor on every column: a card render costs exactly
// `columns.length` calls, so call-count deltas measure card re-renders.
const accessor = vi.fn((row: Row) => row.name);
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor },
  { key: "city", header: "City", accessor },
];

// Hoisted (identity-stable) props — inline equivalents would defeat the memo.
const rowKey = (row: Row) => row.id;
const bulkActions = [
  { key: "export", label: "Export", onClick: () => undefined },
];

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {}
) {
  const adapter = createMemoryAdapter("");
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={rowKey}
        isMobile
        bulkActions={bulkActions}
        {...override}
      />
    );
  }
  return render(<Harness />);
}

describe("mobile card memoization (Base UI)", () => {
  it("a search keystroke re-renders the chrome but no card", () => {
    mount();
    const search = screen.getByPlaceholderText("Search…");
    const before = accessor.mock.calls.length;

    fireEvent.change(search, { target: { value: "a" } });

    expect(search).toHaveValue("a");
    expect(accessor.mock.calls).toHaveLength(before);
  });

  it("toggling one card's checkbox re-renders only that card", () => {
    mount();
    const boxes = screen.getAllByLabelText("Select row");
    const before = accessor.mock.calls.length;

    fireEvent.click(boxes[0]!);

    // At most the toggled card re-rendered (the compiler may even skip its
    // accessor work) — an unmemoized list would re-run every card here.
    expect(accessor.mock.calls.length - before).toBeLessThanOrEqual(
      columns.length
    );
  });
});

describe("summary aggregation (Base UI)", () => {
  it("runs only when its input rows change", () => {
    const summaryRow = vi.fn(() => ({ name: "3 people" }));
    mount({ summaryRow });
    expect(screen.getByText("3 people")).toBeInTheDocument();
    const before = summaryRow.mock.calls.length;

    // Keystrokes re-render the table; the aggregate must not re-run until
    // the debounced term commits and actually changes the rows.
    const search = screen.getByPlaceholderText("Search…");
    fireEvent.change(search, { target: { value: "ali" } });
    expect(summaryRow.mock.calls).toHaveLength(before);
  });
});
