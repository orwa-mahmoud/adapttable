/**
 * What the selected cells add up to.
 *
 * Selecting a block of numbers and wanting their sum is the oldest reason
 * anyone selects a block, and a table that can copy a rectangle already knows
 * everything needed to answer it. The values come from the same resolution
 * copy and export use, so the sum shown here and the sum a spreadsheet
 * computes from a paste of the same cells cannot disagree.
 *
 * The count is every selected cell; the arithmetic covers only the numeric
 * ones. A rectangle spanning a name column and a budget column still has a
 * meaningful sum, and refusing to give one because a string is in the way is
 * the behaviour nobody wants.
 */

import type { ColumnMetadata } from "../contracts/columns";
import { exportCellValue } from "../export/cellValue";
import type { CellRange } from "./cellRange";
import { loadedRangeBounds } from "./loadedRange";

/**
 * The numbers behind a selection.
 *
 * @public
 */
export interface SelectionStats {
  /** Every selected cell in the loaded rows and existing columns. */
  cells: number;
  /** How many of them held a number. */
  numeric: number;
  /** Total of the numeric cells; `null` when there are none. */
  sum: number | null;
  /** Mean of the numeric cells; `null` when there are none. */
  average: number | null;
  /** Smallest numeric value; `null` when there are none. */
  min: number | null;
  /** Largest numeric value; `null` when there are none. */
  max: number | null;
}

/**
 * What the statistics need: the rectangle, and the data under it.
 *
 * @public
 */
export interface SelectionStatsOptions<TRow> {
  /**
   * Off unless the host asked for it. Passed rather than checked at the call
   * site so the two tables that compute this read identically.
   */
  enabled?: boolean;
  /** The selected rectangle, in absolute addresses. */
  range: CellRange | null;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered — a range's column indices address these. */
  columns: readonly ColumnMetadata<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
}

/**
 * A value as a number, or `null` when it is not one.
 *
 * Booleans are not numbers here even though JavaScript will happily add them:
 * summing a column of ticks to 3 says something the table was never asked.
 */
function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Count, sum, average, min and max over the selected cells.
 *
 * Rows outside what the browser holds are skipped rather than counted as
 * empty: a column selection over 500 loaded rows of 100,000 describes the 500,
 * and inventing the rest would put a wrong total on screen.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link SelectionStatsOptions}.
 * @returns The statistics, or `null` when nothing is selected.
 *
 * @public
 */
export function selectionStats<TRow>(
  options: SelectionStatsOptions<TRow>
): SelectionStats | null {
  const { enabled = true, range, rows, columns, firstRowIndex = 0 } = options;
  if (!enabled || !range) return null;
  const bounds = loadedRangeBounds(
    range,
    rows.length,
    columns.length,
    firstRowIndex
  );
  if (bounds.fromCol > bounds.toCol) return null;
  let cells = 0;
  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let rowIndex = bounds.fromRow; rowIndex <= bounds.toRow; rowIndex++) {
    const row = rows[rowIndex];
    if (row === undefined) continue;
    for (
      let columnIndex = bounds.fromCol;
      columnIndex <= bounds.toCol;
      columnIndex++
    ) {
      const column = columns[columnIndex];
      if (column === undefined) continue;
      cells++;
      const value = numeric(exportCellValue(row, column));
      if (value === null) continue;
      count++;
      sum += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (count === 0)
    return {
      cells,
      numeric: 0,
      sum: null,
      average: null,
      min: null,
      max: null,
    };
  return { cells, numeric: count, sum, average: sum / count, min, max };
}
