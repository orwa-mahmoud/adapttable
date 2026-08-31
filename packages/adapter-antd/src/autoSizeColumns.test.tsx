import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef, ColumnLayoutState } from "./index";

interface Row {
  id: string;
  name: string;
  note: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", note: "a very long note that a column has to fit" },
  { id: "2", name: "Alan", note: "short" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "note", header: "Note", accessor: (r) => r.note },
];

/** jsdom lays nothing out, so the cells are told what their content needs. */
function measureAs(container: HTMLElement, widths: Record<string, number>) {
  for (const [key, width] of Object.entries(widths)) {
    for (const cell of container.querySelectorAll<HTMLElement>(
      `[data-column-key="${key}"]`
    )) {
      Object.defineProperty(cell, "scrollWidth", {
        value: width,
        configurable: true,
      });
    }
  }
}

/**
 * Auto-sizing for the mui adapter.
 *
 * Kits size their columns their own way — inline width here, a generated class
 * there — so what these check is the state every kit writes: the layout the
 * host owns and persists.
 */
describe("column auto-sizing (antd)", () => {
  const table = (onColumnLayoutChange: (next: ColumnLayoutState) => void) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        resizableColumns
        enableColumnMenu
        onColumnLayoutChange={onColumnLayoutChange}
      />
    );

  it("sizes one column when its handle is double-clicked", () => {
    const onChange = vi.fn();
    const { container } = table(onChange);
    measureAs(container, { note: 400 });
    fireEvent.doubleClick(
      screen.getAllByRole("button", { name: /resize/i })[1]!
    );
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].widths).toMatchObject({ note: 424 });
  });

  it("sizes every column from the menu", () => {
    const onChange = vi.fn();
    const { container } = table(onChange);
    measureAs(container, { name: 100, note: 400 });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByText("Size columns to content"));
    const widths = Object.assign(
      {},
      ...onChange.mock.calls.map((call) => call[0].widths)
    );
    expect(widths).toMatchObject({ name: 124, note: 424 });
  });

  it("leaves a column alone when there is nothing to measure", () => {
    // An unrendered or empty column keeps the width it had rather than
    // collapsing to the minimum.
    const onChange = vi.fn();
    table(onChange);
    fireEvent.doubleClick(
      screen.getAllByRole("button", { name: /resize/i })[0]!
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
