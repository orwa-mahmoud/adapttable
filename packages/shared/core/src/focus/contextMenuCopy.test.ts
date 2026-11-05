import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuTarget } from "../actions/contextMenuModel";
import type { ColumnModel } from "../contracts/columns";
import type { CellRange } from "./cellRange";
import {
  contextMenuCopyTarget,
  copyContextMenuSelection,
  copyContextMenuTargetCell,
  withContextMenuCellCopy,
} from "./contextMenuCopy";
import type { GridCell } from "./gridFocus";

interface Row {
  id: string;
  name: string;
}

const addresses: Record<string, GridCell> = {
  "a:name": { row: 0, col: 0 },
  "b:name": { row: 1, col: 0 },
  "c:name": { row: 5, col: 3 },
};

function focus(range: CellRange | null) {
  return {
    cellAt: (rowId: string, columnKey: string) =>
      addresses[`${rowId}:${columnKey}`],
    range,
    copyCells: vi.fn(),
  };
}

const selection: CellRange = {
  anchor: { row: 0, col: 0 },
  head: { row: 2, col: 1 },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contextMenuCopyTarget", () => {
  it("copies nothing for a target that names no cell", () => {
    const grid = focus(null);
    expect(
      contextMenuCopyTarget(grid, { kind: "header", columnKey: "name" })
    ).toEqual({
      available: false,
    });
    expect(contextMenuCopyTarget(grid, { kind: "cell", rowId: "a" })).toEqual({
      available: false,
    });
    expect(
      contextMenuCopyTarget(grid, { kind: "cell", columnKey: "name" })
    ).toEqual({
      available: false,
    });
    expect(
      contextMenuCopyTarget(grid, {
        kind: "cell",
        rowId: "gone",
        columnKey: "name",
      })
    ).toEqual({ available: false });
  });

  it("copies the clicked cell unless it sits inside the selection", () => {
    const target = { kind: "cell", rowId: "b", columnKey: "name" };
    expect(contextMenuCopyTarget(focus(null), target)).toEqual({
      available: true,
      cell: { row: 1, col: 0 },
    });
    expect(contextMenuCopyTarget(focus(selection), target)).toEqual({
      available: true,
    });
    expect(
      contextMenuCopyTarget(focus(selection), {
        kind: "cell",
        rowId: "c",
        columnKey: "name",
      })
    ).toEqual({ available: true, cell: { row: 5, col: 3 } });
    expect(
      contextMenuCopyTarget(
        focus({ anchor: { row: 0, col: 1 }, head: { row: 0, col: 2 } }),
        {
          kind: "cell",
          rowId: "a",
          columnKey: "name",
        }
      ).cell
    ).toEqual({ row: 0, col: 0 });
  });
});

describe("copyContextMenuSelection", () => {
  it("copies or cuts the resolved cell, and does nothing without one", () => {
    const grid = focus(null);
    copyContextMenuSelection(grid, {
      kind: "cell",
      rowId: "a",
      columnKey: "name",
    });
    expect(grid.copyCells).toHaveBeenLastCalledWith({ row: 0, col: 0 });
    copyContextMenuSelection(
      grid,
      { kind: "cell", rowId: "b", columnKey: "name" },
      true
    );
    expect(grid.copyCells).toHaveBeenLastCalledWith({ row: 1, col: 0 }, true);
    copyContextMenuSelection(grid, { kind: "row", rowId: "a" });
    expect(grid.copyCells).toHaveBeenCalledTimes(2);

    const selected = focus(selection);
    copyContextMenuSelection(selected, {
      kind: "cell",
      rowId: "a",
      columnKey: "name",
    });
    expect(selected.copyCells).toHaveBeenCalledWith(undefined);
  });
});

describe("copying without cell navigation", () => {
  const columns: ColumnModel<Row>[] = [
    { key: "name", header: "Name", exportValue: (row) => row.name },
  ];
  const cell: ContextMenuTarget<Row> = {
    kind: "cell",
    row: { id: "a", name: "Ada" },
    rowId: "a",
    columnKey: "name",
  };

  function stubClipboard() {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    return writeText;
  }

  it("writes the one cell's export value", () => {
    const writeText = stubClipboard();
    copyContextMenuTargetCell(columns, cell);
    expect(writeText).toHaveBeenCalledWith("Ada");
  });

  it("copies nothing for a row, a header or an unknown column", () => {
    const writeText = stubClipboard();
    copyContextMenuTargetCell(columns, {
      kind: "row",
      row: cell.row,
      rowId: "a",
    });
    copyContextMenuTargetCell(columns, { kind: "header", columnKey: "name" });
    copyContextMenuTargetCell(columns, { ...cell, columnKey: "gone" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("swaps Copy for the single-cell copy only when there is no grid", () => {
    const writeText = stubClipboard();
    const onCopy = vi.fn();
    const actions = { onCopy, onHide: vi.fn() };
    expect(withContextMenuCellCopy(actions, columns, true)).toBe(actions);
    const noCopy = { onHide: vi.fn() };
    expect(withContextMenuCellCopy(noCopy, columns, false)).toBe(noCopy);

    const swapped = withContextMenuCellCopy(actions, columns, false);
    expect(swapped.onHide).toBe(actions.onHide);
    swapped.onCopy?.(cell);
    expect(onCopy).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("Ada");
  });
});
