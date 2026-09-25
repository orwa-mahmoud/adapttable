/**
 * Per-row style and height — host callbacks over the same (row, index)
 * the class hook already uses. Omit both and nothing is applied.
 *
 * A number `rowHeight` is every row; a function is per row. The
 * virtualizer's `estimateSize` reads the same value so a variable-height
 * table windows correctly. `measureElement` stays authoritative for what
 * the browser actually laid out.
 *
 * These are functions of the row, not table state — nothing goes in the URL.
 */
import type { CssProperties } from "../style/cssProperties";

export {
  estimateFromRowHeight,
  resolveRowHeight,
  resolveRowStyle,
  rowStyleSignature,
} from "./rowPresentation";

/**
 * One height, or a height from the row.
 *
 * @public
 */
export type RowHeight<TRow> = number | ((row: TRow, index: number) => number);

/**
 * Conditional per-row inline style.
 *
 * @public
 */
export type RowStyle<TRow> = (
  row: TRow,
  index: number
) => CssProperties | undefined;

/**
 * True when the host asked for a style or a height.
 *
 * @public
 */
export function rowStyleArmed(
  rowStyle: RowStyle<unknown> | undefined,
  rowHeight: RowHeight<unknown> | undefined
): boolean {
  return rowStyle !== undefined || rowHeight !== undefined;
}
