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
import type { CSSProperties } from "react";

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
) => CSSProperties | undefined;

/**
 * Resolve `rowHeight` for one row.
 *
 * @public
 */
export function resolveRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  row: TRow,
  index: number
): number | undefined {
  if (rowHeight === undefined) return undefined;
  return typeof rowHeight === "number" ? rowHeight : rowHeight(row, index);
}

/**
 * Merge `rowStyle` with an explicit height. Height wins when both name it —
 * `rowHeight` is the dedicated override.
 *
 * @public
 */
export function resolveRowStyle<TRow>(
  rowStyle: RowStyle<TRow> | undefined,
  rowHeight: RowHeight<TRow> | undefined,
  row: TRow,
  index: number
): CSSProperties | undefined {
  const style = rowStyle?.(row, index);
  const height = resolveRowHeight(rowHeight, row, index);
  if (style === undefined && height === undefined) return undefined;
  if (height === undefined) return style;
  return { ...style, height };
}

/**
 * Stable compare key for a memoized row's resolved style.
 *
 * @public
 */
export function rowStyleSignature(style: CSSProperties | undefined): string {
  if (style === undefined) return "";
  return JSON.stringify(style);
}

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

/**
 * Virtualizer estimate: a constant, or a per-index read of `rowHeight`.
 * Group/extra slots fall back to `fallback` — they are not data rows.
 *
 * @public
 */
export function estimateFromRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  fallback: number,
  rowAt: (index: number) => { row: TRow; index: number } | undefined
): (index: number) => number {
  if (rowHeight === undefined) return () => fallback;
  if (typeof rowHeight === "number") return () => rowHeight;
  return (index: number) => {
    const found = rowAt(index);
    if (!found) return fallback;
    return rowHeight(found.row, found.index);
  };
}
