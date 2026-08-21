import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "1", name: "A", budget: 10 },
  { id: "2", name: "B", budget: 30 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
  { key: "budget", header: "B", accessor: (r) => r.budget },
];

/**
 * Selection statistics for the unstyled adapter.
 *
 * Core owns the arithmetic; each adapter has to render the strip where the
 * table can be seen, and render nothing at all without the prop.
 */
describe("selection statistics (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
        {...extra}
      />
    );
  const strip = () =>
    document.querySelector('[data-adapttable-part="selection-stats"]');
  const cell = (row: number, col: number) =>
    document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;
  const selectBudgetColumn = () => {
    fireEvent.mouseDown(cell(0, 1));
    fireEvent.mouseEnter(cell(1, 1));
    fireEvent.mouseUp(cell(1, 1));
  };

  it("adds up the selected cells", () => {
    table({ selectionStats: true, locale: "en-US" });
    selectBudgetColumn();
    expect(strip()?.textContent).toContain("Sum 40");
    expect(strip()?.textContent).toContain("Avg 20");
  });

  it("renders nothing without the prop", () => {
    table();
    selectBudgetColumn();
    expect(strip()).toBeNull();
  });

  it("says nothing about a single cell", () => {
    table({ selectionStats: true });
    fireEvent.mouseDown(cell(0, 1));
    fireEvent.mouseUp(cell(0, 1));
    expect(strip()).toBeNull();
  });

  it("hosts the stats inside the status bar", () => {
    table({ selectionStats: true, statusBar: true, locale: "en-US" });
    selectBudgetColumn();
    const bar = document.querySelector('[data-adapttable-part="status-bar"]');
    expect(
      bar?.querySelector('[data-adapttable-part="selection-stats"]')
    ).not.toBeNull();
    expect(bar?.textContent).toContain("Sum 40");
  });
});
