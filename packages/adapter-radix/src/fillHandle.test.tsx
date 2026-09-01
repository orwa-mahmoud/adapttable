import { Theme } from "@radix-ui/themes";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
  { id: "3", name: "C" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name, editable: true },
];

/**
 * Fill-handle parity for the radix adapter.
 *
 * Core owns the gesture; what each adapter has to get right is that the square
 * reaches the corner cell at all, and that dragging it commits through the
 * ordinary edit channel.
 */
describe("the fill handle (radix)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          cellNavigation
          {...extra}
        />
      </Theme>
    );
  const handles = () =>
    document.querySelectorAll('[data-adapttable-part="fill-handle"]');
  const cell = (row: number, col: number) =>
    document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

  it("puts one square on the selection's corner", () => {
    table({ onCellEdit: vi.fn() });
    fireEvent.mouseDown(cell(0, 0));
    fireEvent.mouseEnter(cell(1, 0));
    fireEvent.mouseUp(cell(1, 0));
    expect(handles()).toHaveLength(1);
    expect(cell(1, 0).contains(handles()[0]!)).toBe(true);
  });

  it("carries the value down a drag, through onCellEdit", () => {
    const onCellEdit = vi.fn();
    table({ onCellEdit });
    fireEvent.mouseDown(cell(0, 0));
    fireEvent.mouseUp(cell(0, 0));
    fireEvent.mouseDown(handles()[0]!);
    fireEvent.mouseEnter(cell(2, 0));
    fireEvent.mouseUp(window);
    expect(onCellEdit.mock.calls).toEqual([
      [ROWS[1], "name", "A"],
      [ROWS[2], "name", "A"],
    ]);
  });

  it("renders no square on a table nobody can edit", () => {
    table();
    fireEvent.mouseDown(cell(0, 0));
    fireEvent.mouseUp(cell(0, 0));
    expect(handles()).toHaveLength(0);
  });
});
