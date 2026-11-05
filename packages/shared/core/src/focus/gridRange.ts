/**
 * Range selection on top of base navigation.
 *
 * Shift-extend, drag, and column select. Clipboard and fill are not imported.
 */
import { defaultLabels } from "../labels";
import {
  type CellRange,
  cellRangeBounds,
  cellRangeSize,
  extendCellRange,
  isSingleCell,
  singleCellRange,
} from "./cellRange";
import type { GridCell } from "./gridFocus";
import {
  type GridKeyEvent,
  type GridNavSession,
  lastLoadedRow,
} from "./gridNavigation";

/**
 * Whether the selection is exactly one column, over every loaded row.
 *
 * Both bounds are checked, not just the columns: a rectangle three rows tall
 * inside one column is not that column selected, and a checkbox claiming it
 * is would tell the reader a copy or an export covers rows it does not.
 *
 * @param input - Whether navigation is on, the selection, and the loaded
 *   window.
 * @param col - The column's index.
 * @returns Whether the column is selected.
 *
 * @public
 */
export function isGridColumnSelected(
  input: {
    readonly enabled: boolean;
    readonly range: CellRange | null;
    readonly firstRowIndex: number;
    readonly loadedRows: number;
  },
  col: number
): boolean {
  const { enabled, range, firstRowIndex, loadedRows } = input;
  if (!enabled || !range) return false;
  const bounds = cellRangeBounds(range);
  return (
    bounds.fromCol === col &&
    bounds.toCol === col &&
    bounds.fromRow === firstRowIndex &&
    bounds.toRow === lastLoadedRow(firstRowIndex, loadedRows)
  );
}

/** Select a rectangle and announce it. A single cell stays quiet. */
export function selectGridRange<TRow>(
  session: GridNavSession<TRow>,
  next: CellRange | null
): void {
  session.batch(() => {
    session.write({ range: next });
    session.options.onRangeChange?.(next);
    if (!next || isSingleCell(next)) return;
    const b = cellRangeBounds(next);
    session.say(
      (session.labels()?.gridRangeSelection ?? defaultLabels.gridRangeSelection)({
        fromRow: b.fromRow + 1,
        toRow: b.toRow + 1,
        fromColumn: b.fromCol + 1,
        toColumn: b.toCol + 1,
        cells: cellRangeSize(next),
      })
    );
  });
}

/** After a move: focus the cell, then extend or collapse the selection. */
export function rangeAfterMove<TRow>(
  session: GridNavSession<TRow>,
  event: GridKeyEvent,
  next: GridCell,
  from: GridCell
): void {
  session.batch(() => {
    session.focusCell(next);
    selectGridRange(
      session,
      event.shiftKey === true
        ? extendCellRange(session.snapshot.range, next, from)
        : singleCellRange(next)
    );
  });
}

/** A pointer press: Shift extends, a plain press starts a drag. */
export function pressGridCell<TRow>(
  session: GridNavSession<TRow>,
  cell: GridCell,
  event: { shiftKey?: boolean }
): void {
  const { active, range } = session.snapshot;
  if (event.shiftKey === true) {
    selectGridRange(session, extendCellRange(range, cell, active ?? cell));
    return;
  }
  session.dragging = true;
  selectGridRange(session, singleCellRange(cell));
}

/** The pointer entered a cell during a selection drag. */
export function enterGridSelection<TRow>(
  session: GridNavSession<TRow>,
  cell: GridCell
): void {
  if (!session.dragging) return;
  const { active, range } = session.snapshot;
  selectGridRange(session, extendCellRange(range, cell, active ?? cell));
}

/** Select the loaded rows of one column, optionally extending. */
export function selectGridColumn<TRow>(
  session: GridNavSession<TRow>,
  col: number,
  extend: boolean
): void {
  const top = { row: session.firstRow(), col };
  const bottom = {
    row: lastLoadedRow(session.firstRow(), session.options.rows.length),
    col,
  };
  const { range } = session.snapshot;
  session.batch(() => {
    selectGridRange(
      session,
      extend && range
        ? extendCellRange(range, bottom, range.anchor)
        : { anchor: top, head: bottom }
    );
    session.focusCell(top);
  });
}

/** Select this column, or clear it when it is already exactly this column. */
export function toggleGridColumn<TRow>(
  session: GridNavSession<TRow>,
  col: number
): void {
  if (
    isGridColumnSelected(
      {
        enabled: session.options.enabled,
        range: session.snapshot.range,
        firstRowIndex: session.firstRow(),
        loadedRows: session.options.rows.length,
      },
      col
    )
  ) {
    selectGridRange(session, null);
    return;
  }
  selectGridColumn(session, col, false);
}

/** Ctrl/Cmd+click selects a column; a plain click selects only a non-sorting header. */
export function clickGridHeader<TRow>(
  session: GridNavSession<TRow>,
  col: number,
  event: { ctrlKey?: boolean; metaKey?: boolean },
  sortable?: boolean
): void {
  const modified = event.ctrlKey === true || event.metaKey === true;
  if (!modified && sortable === true) return;
  selectGridColumn(session, col, modified);
}
