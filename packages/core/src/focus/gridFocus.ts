/**
 * Where the keyboard is, in a grid of cells — the pure part.
 *
 * A table is one tab stop, not hundreds. The focused cell carries
 * `tabIndex=0` and every other cell `-1`, so Tab enters and leaves the table
 * while the arrow keys move inside it. That is the roving-tabindex pattern the
 * ARIA grid practice asks for, and it is the only reason a 10,000-row table is
 * navigable at all.
 *
 * This file is the arithmetic: given where focus is and which key was pressed,
 * where does it go. No React, no DOM — which is what makes every edge testable
 * without rendering anything. {@link useGridFocus} owns the state and the
 * scrolling, and the adapters own none of it.
 */
import type { Direction } from "../types";

/**
 * A cell address in the grid: both indices absolute, both zero-based.
 *
 * @public
 */
export interface GridCell {
  /** Row index within the whole dataset, not within the rendered window. */
  row: number;
  /** Column index within the visible column set. */
  col: number;
}

/**
 * The grid's shape, as the mover needs to see it.
 *
 * @internal
 */
export interface GridBounds {
  /** Total rows the user can reach — the dataset, not the rendered slice. */
  rowCount: number;
  /** Total columns the user can reach. */
  colCount: number;
  /**
   * Rows a PageUp/PageDown travels. The viewport's worth, so paging feels like
   * paging rather than an arbitrary jump.
   */
  pageSize: number;
}

/**
 * What a key press means. Named rather than passed as raw keys so the mapping
 * is testable on its own and an adapter can bind a kit's own control to the
 * same intent.
 *
 * @internal
 */
export type GridFocusMove =
  | "up"
  | "down"
  | "left"
  | "right"
  | "rowStart"
  | "rowEnd"
  | "gridStart"
  | "gridEnd"
  | "pageUp"
  | "pageDown";

/** Clamp to the grid; a move that would leave it stops at the edge instead. */
function clamp(value: number, max: number): number {
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

/**
 * Where a move lands, clamped to the grid.
 *
 * Edges stop rather than wrap. Wrapping a right-arrow from the last column to
 * the first cell of the next row is a spreadsheet convention, and in a table
 * it silently moves the user to a different record — so this holds still and
 * lets the screen reader stay quiet.
 *
 * @param from - Where focus is now.
 * @param move - The intent, from {@link gridFocusMoveForKey}.
 * @param bounds - The grid's shape.
 * @returns The new address, which may equal `from` at an edge.
 */
function stepGridFocus(
  from: GridCell,
  move: GridFocusMove,
  bounds: GridBounds
): GridCell {
  const lastRow = Math.max(0, bounds.rowCount - 1);
  const lastCol = Math.max(0, bounds.colCount - 1);
  const step = Math.max(1, bounds.pageSize);

  switch (move) {
    case "up":
      return { row: clamp(from.row - 1, lastRow), col: from.col };
    case "down":
      return { row: clamp(from.row + 1, lastRow), col: from.col };
    case "left":
      return { row: from.row, col: clamp(from.col - 1, lastCol) };
    case "right":
      return { row: from.row, col: clamp(from.col + 1, lastCol) };
    case "rowStart":
      return { row: from.row, col: 0 };
    case "rowEnd":
      return { row: from.row, col: lastCol };
    case "gridStart":
      return { row: 0, col: 0 };
    case "gridEnd":
      return { row: lastRow, col: lastCol };
    case "pageUp":
      return { row: clamp(from.row - step, lastRow), col: from.col };
    case "pageDown":
      return { row: clamp(from.row + step, lastRow), col: from.col };
  }
}

/**
 * Where a move lands, clamped to the grid.
 *
 * Edges stop rather than wrap. Wrapping a right-arrow from the last column to
 * the first cell of the next row is a spreadsheet convention, and in a table
 * it silently moves the user to a different record — so this holds still and
 * lets the screen reader stay quiet.
 *
 * A covered cell (inside someone else's row/col span) is skipped in the
 * same direction; if every remaining cell is covered, focus stays put.
 *
 * @param from - Where focus is now.
 * @param move - The intent, from {@link gridFocusMoveForKey}.
 * @param bounds - The grid's shape.
 * @param covered - True for a cell that must not receive focus.
 * @returns The new address, which may equal `from` at an edge.
 *
 * @internal
 */
export function moveGridFocus(
  from: GridCell,
  move: GridFocusMove,
  bounds: GridBounds,
  covered?: (cell: GridCell) => boolean
): GridCell {
  const landed = stepGridFocus(from, move, bounds);
  if (!covered?.(landed)) return landed;
  let current = landed;
  // Edges stop rather than wrap, so this always hits `sameGridCell` before
  // it could cycle. A trip-count would never run.
  for (;;) {
    const next = stepGridFocus(current, move, bounds);
    if (sameGridCell(next, current)) return from;
    if (!covered(next)) return next;
    current = next;
  }
}

/**
 * The key press, as much of it as the mapping needs.
 *
 * @internal
 */
export interface GridKeyPress {
  /** Stable key for the entry. */
  key: string;
  /** Ctrl or Cmd — either one means "to the end of the grid". */
  ctrlKey?: boolean;
  /** Whether the Meta key was held. */
  metaKey?: boolean;
}

/**
 * Turn a key press into a move, or `null` when the grid should not react.
 *
 * Left and Right swap under `dir="rtl"`, because the arrow keys describe the
 * screen and not the data: in a mirrored table the visually-next column is the
 * previous one. Nothing else flips — Home is still the start of the row, which
 * in RTL is its right-hand end, and that is what a user pressing Home wants.
 *
 * @param press - The key event, narrowed to what matters.
 * @param dir - The table's text direction.
 * @returns The intended move, or `null` to let the event through untouched.
 *
 * @internal
 */
export function gridFocusMoveForKey(
  press: GridKeyPress,
  dir: Direction = "ltr"
): GridFocusMove | null {
  const toEnd =
    Boolean(press.ctrlKey ?? false) || Boolean(press.metaKey ?? false);
  const rtl = dir === "rtl";

  switch (press.key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return rtl ? "right" : "left";
    case "ArrowRight":
      return rtl ? "left" : "right";
    case "Home":
      return toEnd ? "gridStart" : "rowStart";
    case "End":
      return toEnd ? "gridEnd" : "rowEnd";
    case "PageUp":
      return "pageUp";
    case "PageDown":
      return "pageDown";
    default:
      return null;
  }
}

/**
 * Are two addresses the same cell?
 *
 * @internal
 */
export function sameGridCell(a: GridCell | null, b: GridCell | null): boolean {
  if (!a || !b) return a === b;
  return a.row === b.row && a.col === b.col;
}
