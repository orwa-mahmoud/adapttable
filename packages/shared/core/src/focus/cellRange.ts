/**
 * A rectangle of selected cells — the pure part.
 *
 * Range selection is two addresses, not a list: an **anchor** where the
 * selection started and a **head** where it currently reaches. Every cell
 * between them is selected, which is why extending a range never has to
 * enumerate anything and a 10,000-row selection costs two numbers.
 *
 * Keeping the anchor is the whole reason this is a model rather than a set.
 * Shift+Down twice then Shift+Up must shrink the range back, not start a new
 * one downward — and it only does that if the origin is remembered.
 */
import { type GridCell, sameGridCell } from "./gridFocus";

/**
 * A rectangle of cells, stored as the two corners that made it.
 *
 * @public
 */
export interface CellRange {
  /** Where the selection began — fixed while the head moves. */
  anchor: GridCell;
  /** Where it currently reaches — the moving corner. */
  head: GridCell;
}

/**
 * The rectangle's edges, normalized so `from` is always the top-left.
 *
 * @public
 */
export interface CellRangeBounds {
  /** First row in the range. */
  fromRow: number;
  /** Last row in the range. */
  toRow: number;
  /** First column in the range. */
  fromCol: number;
  /** Last column in the range. */
  toCol: number;
}

/**
 * The rectangle a range covers, with the corners sorted.
 *
 * A range dragged upward has an anchor below its head, so every consumer would
 * otherwise repeat the same min/max dance and one of them would forget.
 *
 * @public
 */
export function cellRangeBounds(range: CellRange): CellRangeBounds {
  return {
    fromRow: Math.min(range.anchor.row, range.head.row),
    toRow: Math.max(range.anchor.row, range.head.row),
    fromCol: Math.min(range.anchor.col, range.head.col),
    toCol: Math.max(range.anchor.col, range.head.col),
  };
}

/**
 * Is this cell inside the range?
 *
 * @public
 */
export function isInCellRange(
  range: CellRange | null,
  cell: GridCell
): boolean {
  if (!range) return false;
  const b = cellRangeBounds(range);
  return (
    cell.row >= b.fromRow &&
    cell.row <= b.toRow &&
    cell.col >= b.fromCol &&
    cell.col <= b.toCol
  );
}

/**
 * How many cells the range covers — rows × columns, never enumerated.
 *
 * @public
 */
export function cellRangeSize(range: CellRange | null): number {
  if (!range) return 0;
  const b = cellRangeBounds(range);
  return (b.toRow - b.fromRow + 1) * (b.toCol - b.fromCol + 1);
}

/**
 * A single cell selected on its own.
 *
 * @public
 */
export function singleCellRange(cell: GridCell): CellRange {
  return { anchor: cell, head: cell };
}

/**
 * Move the head, keeping the anchor — what Shift+arrow and Shift+click do.
 *
 * Starting from nothing anchors at the cell that had focus, so the first
 * Shift+Down selects two cells rather than one.
 *
 * @public
 */
export function extendCellRange(
  range: CellRange | null,
  head: GridCell,
  fallbackAnchor: GridCell
): CellRange {
  return { anchor: range?.anchor ?? fallbackAnchor, head };
}

/**
 * Is the range a single cell? Useful for deciding whether to show chrome.
 *
 * @public
 */
export function isSingleCell(range: CellRange | null): boolean {
  return range !== null && sameGridCell(range.anchor, range.head);
}

/**
 * The rows and columns a range covers, as index lists.
 *
 * This is the one place that does enumerate, because an exporter has to walk
 * them — and it is a deliberate boundary: the model stays two corners, and
 * anything that needs the cells asks for them explicitly.
 *
 * @public
 */
export function cellRangeIndices(range: CellRange): {
  rows: number[];
  cols: number[];
} {
  const b = cellRangeBounds(range);
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = b.fromRow; r <= b.toRow; r++) rows.push(r);
  for (let c = b.fromCol; c <= b.toCol; c++) cols.push(c);
  return { rows, cols };
}
