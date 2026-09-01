import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
  score: number;
}
const ROWS: Row[] = [
  { id: "1", name: "A", score: 1 },
  { id: "2", name: "B", score: 2 },
  { id: "3", name: "C", score: 7 },
  { id: "4", name: "D", score: 7 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name, editable: true },
  {
    key: "score",
    header: "S",
    accessor: (r) => r.score,
    editable: true,
    parseValue: (draft) => Number(draft),
  },
];

/**
 * The fill handle, end to end through a real table.
 *
 * The arithmetic is covered in core; this covers the parts only a rendered
 * table has — that the square appears on the selection's corner and nowhere
 * else, that dragging it commits edits, and that a table nobody can edit shows
 * no affordance at all.
 */
describe("the fill handle (unstyled)", () => {
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
  const handles = (c: HTMLElement) =>
    c.querySelectorAll('[data-adapttable-part="fill-handle"]');
  const cell = (c: HTMLElement, row: number, col: number) =>
    c.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

  it("shows nothing until something is selected", () => {
    const { container } = table({ onCellEdit: vi.fn() });
    expect(handles(container)).toHaveLength(0);
  });

  it("sits on the selection's corner, and only there", () => {
    const { container } = table({ onCellEdit: vi.fn() });
    fireEvent.mouseDown(cell(container, 0, 0));
    fireEvent.mouseEnter(cell(container, 1, 1));
    fireEvent.mouseUp(cell(container, 1, 1));
    expect(handles(container)).toHaveLength(1);
    // The bottom inline-end cell of the rectangle carries it.
    expect(cell(container, 1, 1).contains(handles(container)[0]!)).toBe(true);
  });

  it("stays absent when the table takes no edits", () => {
    // An affordance for a gesture nothing listens to would be a lie.
    const { container } = table();
    fireEvent.mouseDown(cell(container, 0, 0));
    fireEvent.mouseUp(cell(container, 0, 0));
    expect(handles(container)).toHaveLength(0);
  });

  it("carries the selection's value down the drag", () => {
    const onCellEdit = vi.fn();
    const { container } = table({ onCellEdit });
    fireEvent.mouseDown(cell(container, 0, 0));
    fireEvent.mouseUp(cell(container, 0, 0));
    fireEvent.mouseDown(handles(container)[0]!);
    fireEvent.mouseEnter(cell(container, 2, 0));
    fireEvent.mouseUp(window);
    expect(onCellEdit.mock.calls).toEqual([
      [ROWS[1], "name", "A"],
      [ROWS[2], "name", "A"],
    ]);
  });

  it("previews the cells it would write while the drag is live", () => {
    const { container } = table({ onCellEdit: vi.fn() });
    fireEvent.mouseDown(cell(container, 0, 0));
    fireEvent.mouseUp(cell(container, 0, 0));
    fireEvent.mouseDown(handles(container)[0]!);
    fireEvent.mouseEnter(cell(container, 2, 0));
    // Source plus the two it would fill — highlighted before anything is
    // written, so the preview and the commit cannot disagree.
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(3);
  });

  it("fills down the selection on Ctrl+D", () => {
    const onCellEdit = vi.fn();
    const { container } = table({ onCellEdit });
    fireEvent.mouseDown(cell(container, 0, 1));
    fireEvent.mouseEnter(cell(container, 2, 1));
    fireEvent.mouseUp(cell(container, 2, 1));
    fireEvent.keyDown(cell(container, 0, 1), { key: "d", ctrlKey: true });
    // The top row carries into the rest: 1 repeats, since one value has no step.
    expect(onCellEdit.mock.calls).toEqual([
      [ROWS[1], "score", 1],
      [ROWS[2], "score", 1],
    ]);
  });

  it("says how much was filled", () => {
    const { container } = table({ onCellEdit: vi.fn() });
    fireEvent.mouseDown(cell(container, 0, 1));
    fireEvent.mouseEnter(cell(container, 1, 1));
    fireEvent.mouseUp(cell(container, 1, 1));
    fireEvent.keyDown(cell(container, 0, 1), { key: "d", ctrlKey: true });
    expect(
      container.parentElement?.querySelector(
        '[data-adapttable-part="grid-announcer"]'
      )?.textContent
    ).toBe("1 cell filled");
  });
});
