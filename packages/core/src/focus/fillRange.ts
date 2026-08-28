/**
 * The fill handle — dragging a selection's corner to carry its values on.
 *
 * The gesture is a spreadsheet's, and so is the behaviour people expect from
 * it: two numbers one apart continue counting, anything else repeats. What it
 * produces is not special, though — the same ordinary cell edits a paste or an
 * inline commit produces, so a host wires nothing extra to receive a fill.
 *
 * Values are read the way the EDITOR reads them (`readEditableCellValue`) and
 * written back through the column's `parseValue`, which makes a fill exactly
 * equivalent to retyping the source cell into each target cell — never a
 * separate notion of what a cell contains.
 */
import { isCellEditable, readEditableCellValue } from "../editing/cellEditing";
import type { ColumnDef } from "../types";
import type { CellEdit } from "./cellEdits";
import { type CellRange, cellRangeBounds } from "./cellRange";
import type { GridCell } from "./gridFocus";

/**
 * Which way a fill runs. Fills are one-axis, as in every spreadsheet.
 *
 * @internal
 */
export type FillDirection = "down" | "up" | "right" | "left";

/**
 * Which way a drag from the selection's corner to `to` is filling.
 *
 * A pointer wanders, so the axis is decided by the LARGER overflow rather than
 * by whichever edge was crossed first — otherwise a drag two rows down and one
 * column across would fill sideways because of a stray pixel.
 *
 * @param source - The selected rectangle the fill starts from.
 * @param to - The cell the pointer has reached.
 * @returns The direction, or `null` when `to` is still inside the selection.
 *
 * @internal
 */
export function fillDirection(
  source: CellRange,
  to: GridCell
): FillDirection | null {
  const bounds = cellRangeBounds(source);
  const below = to.row - bounds.toRow;
  const above = bounds.fromRow - to.row;
  const after = to.col - bounds.toCol;
  const before = bounds.fromCol - to.col;
  const vertical = Math.max(below, above);
  const horizontal = Math.max(after, before);
  if (vertical <= 0 && horizontal <= 0) return null;
  if (vertical >= horizontal) return below > 0 ? "down" : "up";
  return after > 0 ? "right" : "left";
}

/**
 * The rectangle a fill would cover — the selection plus what the drag reached.
 *
 * This is what gets highlighted while dragging, so the preview and the commit
 * can never disagree about which cells are involved.
 *
 * @param source - The selected rectangle.
 * @param to - The cell the pointer has reached.
 * @returns The union rectangle, or the source itself when nothing is added.
 *
 * @internal
 */
export function fillTargetRange(source: CellRange, to: GridCell): CellRange {
  const bounds = cellRangeBounds(source);
  const direction = fillDirection(source, to);
  if (direction === null) return source;
  const vertical = direction === "down" || direction === "up";
  return {
    anchor: {
      row: vertical && direction === "up" ? to.row : bounds.fromRow,
      col: !vertical && direction === "left" ? to.col : bounds.fromCol,
    },
    head: {
      row: vertical && direction === "down" ? to.row : bounds.toRow,
      col: !vertical && direction === "right" ? to.col : bounds.toCol,
    },
  };
}

/**
 * What a fill needs to know to become edits.
 *
 * @internal
 */
export interface FillRangeOptions<TRow> {
  /** The selected rectangle the values come from. */
  source: CellRange;
  /** The cell the drag reached, or the far end of a keyboard fill. */
  to: GridCell;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered — a range's column indices address these. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
}

/**
 * Continue a run of values, the way a spreadsheet continues one.
 *
 * Two or more numbers separated by a constant step are a series and count on
 * (1, 2 → 3, 4); everything else repeats in order (Mon, Tue → Mon, Tue). A
 * single number repeats rather than counting, because one value carries no
 * step — guessing `+1` there is the behaviour spreadsheets are cursed for.
 *
 * @param seed - The source values, in fill order.
 * @param step - How far past the seed this value sits, from 1.
 * @returns The value for that position, as the string an editor would hold.
 */
function continueSeries(seed: readonly string[], step: number): string {
  const delta = arithmeticStep(seed);
  if (delta === null) return seed[(step - 1) % seed.length] ?? "";
  return String(Number(seed.at(-1)) + delta * step);
}

/**
 * The constant step of a run of numbers, or `null` when it is not one.
 *
 * @param seed - The source values.
 * @returns The step between consecutive values, or `null`.
 */
function arithmeticStep(seed: readonly string[]): number | null {
  if (seed.length < 2) return null;
  const numbers = seed.map((value) =>
    value.trim() === "" ? Number.NaN : Number(value)
  );
  if (!numbers.every((value) => Number.isFinite(value))) return null;
  const step = numbers[1]! - numbers[0]!;
  const constant = numbers.every((value, i) => {
    const previous = numbers[i - 1];
    return previous === undefined || value - previous === step;
  });
  return constant ? step : null;
}

/**
 * A fill in one coordinate system, whichever way it actually runs.
 *
 * Down, up, right and left are one operation seen from four angles, and
 * writing it four times is where the bugs live. So a fill is described as
 * LANES (the rows or columns the fill runs along, side by side) and POSITIONS
 * (how far along each lane), with `at` the only place that knows whether a
 * position is a row or a column.
 */
interface FillAxis {
  /** The perpendicular indices — one seed run and one output run each. */
  lanes: number[];
  /** Positions of the source cells, in the order the fill reads them. */
  seed: number[];
  /** The position the fill grows from — the selection's leading edge. */
  edge: number;
  /** +1 for a fill that runs forwards, -1 for one that runs back. */
  step: number;
  /** How many cells past the edge the gesture reached. */
  distance: number;
  /** A lane and a position, as a cell address. */
  at: (lane: number, position: number) => GridCell;
}

/** Describe the fill in lane/position terms, whichever way it runs. */
function fillAxis(
  direction: FillDirection,
  source: CellRange,
  to: GridCell
): FillAxis {
  const b = cellRangeBounds(source);
  const vertical = direction === "down" || direction === "up";
  const forward = direction === "down" || direction === "right";
  const step = forward ? 1 : -1;
  const along = vertical ? span(b.fromRow, b.toRow) : span(b.fromCol, b.toCol);
  // A backwards fill continues from the near edge, so its seed runs the other
  // way: "1, 2" dragged upwards continues 0, -1 rather than 3, 4.
  const seed = forward ? along : [...along].reverse();
  const edgeRow = forward ? b.toRow : b.fromRow;
  const edgeCol = forward ? b.toCol : b.fromCol;
  return {
    lanes: vertical ? span(b.fromCol, b.toCol) : span(b.fromRow, b.toRow),
    seed,
    edge: vertical ? edgeRow : edgeCol,
    step,
    distance: Math.abs(vertical ? to.row - edgeRow : to.col - edgeCol),
    at: (lane, position) =>
      vertical ? { row: position, col: lane } : { row: lane, col: position },
  };
}

/**
 * Turn a fill gesture into the edits it implies.
 *
 * Only cells OUTSIDE the selection are written: the source is what is being
 * carried, not something to overwrite with itself. Cells beyond the loaded rows
 * or the rendered columns are dropped rather than invented, and a column that
 * is not editable is skipped.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link FillRangeOptions}.
 * @returns The edits, in reading order.
 *
 * @internal
 */
export function fillRangeEdits<TRow>(
  options: FillRangeOptions<TRow>
): CellEdit<TRow>[] {
  const { source, to, rows, columns, firstRowIndex = 0 } = options;
  const direction = fillDirection(source, to);
  if (direction === null) return [];
  const axis = fillAxis(direction, source, to);
  const edits: CellEdit<TRow>[] = [];

  for (const lane of axis.lanes) {
    const seed = axis.seed.flatMap((position) =>
      readCell(axis.at(lane, position), options)
    );
    if (seed.length === 0) continue;

    for (let n = 1; n <= axis.distance; n++) {
      const cell = axis.at(lane, axis.edge + n * axis.step);
      const row = rows[cell.row - firstRowIndex];
      const column = columns[cell.col];
      if (row === undefined || !column || !isCellEditable(column, row)) {
        continue;
      }
      const raw = continueSeries(seed, n);
      edits.push({
        row,
        columnKey: column.key,
        // The column's own parser, so a fill commits what retyping would.
        value: column.parseValue ? column.parseValue(raw, row) : raw,
      });
    }
  }
  return edits;
}

/**
 * One source cell as the editor would read it, or nothing when the cell is not
 * there — an unloaded row or a column the table does not render.
 */
function readCell<TRow>(
  cell: GridCell,
  options: FillRangeOptions<TRow>
): string[] {
  const { rows, columns, firstRowIndex = 0 } = options;
  const row = rows[cell.row - firstRowIndex];
  const column = columns[cell.col];
  if (row === undefined || !column) return [];
  return [readEditableCellValue(row, column)];
}

/** Inclusive integer span — the indices between two edges. */
function span(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
