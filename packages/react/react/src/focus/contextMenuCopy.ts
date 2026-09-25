/**
 * What a context-menu Copy should act on.
 *
 * The menu hands the kit a `ContextMenuTarget` — a row key and a column key,
 * the identity of what was clicked. Copying needs a grid address, and the two
 * are not the same thing: a row's position on screen follows the sort, the
 * filter, the page, the pinned rows and the virtual window, none of which a
 * row key knows. `GridFocusState.cellAt` resolves it against the very rows
 * and columns the grid was handed, so this decides only WHICH cell is meant.
 */
import {
  type CellRange,
  cellRangeBounds,
  type GridCell,
} from "@adapttable/core";

import type { GridFocusState } from "./useGridFocus";

/** What {@link contextMenuCopyTarget} decided. @public */
export interface ContextMenuCopyTarget {
  /** Whether Copy has anything to act on at all. */
  readonly available: boolean;
  /**
   * The single cell to copy, or `undefined` to copy the current selection —
   * which is what the click landing inside that selection means.
   */
  readonly cell?: GridCell;
}

const NOTHING: ContextMenuCopyTarget = { available: false };

/** Whether a cell sits inside a selected rectangle. */
function inside(range: CellRange, cell: GridCell): boolean {
  const bounds = cellRangeBounds(range);
  return (
    cell.row >= bounds.fromRow &&
    cell.row <= bounds.toRow &&
    cell.col >= bounds.fromCol &&
    cell.col <= bounds.toCol
  );
}

/**
 * Decide what a context-menu Copy copies.
 *
 * Right-clicking a cell with nothing selected copies that cell. Right-clicking
 * inside a selection keeps the selection — the rectangle is what the reader
 * built and is asking for. Right-clicking outside one copies the cell under
 * the cursor, because a selection somewhere else is not what was pointed at.
 *
 * A target that names no cell — a row menu over a pinned spacer, a header —
 * copies nothing rather than inventing a coordinate.
 *
 * @param focus - Live grid focus, for `cellAt` and the current range.
 * @param target - What the menu was opened over.
 * @returns Whether Copy can run, and the cell it should take.
 *
 * @public
 */
export function contextMenuCopyTarget(
  focus: Pick<GridFocusState, "cellAt" | "range">,
  target: { kind: string; rowId?: string; columnKey?: string }
): ContextMenuCopyTarget {
  if (target.kind !== "cell") return NOTHING;
  if (target.rowId === undefined || target.columnKey === undefined) {
    return NOTHING;
  }
  const cell = focus.cellAt(target.rowId, target.columnKey);
  if (!cell) return NOTHING;
  if (focus.range && inside(focus.range, cell)) return { available: true };
  return { available: true, cell };
}
