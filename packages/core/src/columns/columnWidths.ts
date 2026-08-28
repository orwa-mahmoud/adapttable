import type { ColumnDef } from "../types";

/** A column identity for width resolution — just its key and declared width. */
type WidthColumn = Pick<ColumnDef<unknown>, "key" | "width">;

/** Fallback width (px) for a pinned column with no resolvable declared width. */
export const FALLBACK_PIN_WIDTH = 150;

/**
 * Parse a declared column width to pixels, or `undefined` when it carries no
 * pixel value (relative units like `%`, `rem`, `fr` have no px here, so
 * `parseInt("50%")` → 50 would silently corrupt a sticky inset / min-width).
 *
 * @public
 */
export function parsePxWidth(
  width: number | string | undefined
): number | undefined {
  if (typeof width === "number") return width;
  if (
    typeof width === "string" &&
    /^\d+(?:\.\d+)?(?:px)?$/.test(width.trim())
  ) {
    return Number.parseFloat(width);
  }
  return undefined;
}

/**
 * A column's effective pixel width: a resize override (from the layout
 * `widths` map) wins over the declared width. `undefined` when neither
 * resolves to pixels.
 *
 * @public
 */
export function resolveColumnWidth(
  column: WidthColumn,
  widths?: Readonly<Record<string, number>>
): number | undefined {
  const override = widths?.[column.key];
  if (typeof override === "number") return override;
  return parsePxWidth(column.width);
}

/**
 * Total pixel width of the fixed-width columns, plus any extra leading/trailing
 * fixed columns (selection checkbox, actions). Columns without a px width
 * contribute nothing, so a table with no declared widths returns `0` and is
 * never forced to a min-width. Adapters apply the result as the table's
 * `min-width` so a fixed-width table scrolls horizontally instead of squishing
 * its columns below their declared sizes.
 *
 * @typeParam TRow - The row type.
 * @param columns - The visible columns.
 * @param options - `widths` resize overrides; `extra` px for non-data columns.
 * @returns The min table width in px, or `0` when no column declares a width.
 *
 * @public
 */
export function tableMinWidth<TRow>(
  columns: readonly ColumnDef<TRow>[],
  options: { widths?: Readonly<Record<string, number>>; extra?: number } = {}
): number {
  const total = columns.reduce(
    (sum, column) => sum + (resolveColumnWidth(column, options.widths) ?? 0),
    0
  );
  return total > 0 ? total + (options.extra ?? 0) : 0;
}

/**
 * The pixel width to RENDER a pinned column at: its resolved width, else
 * `FALLBACK_PIN_WIDTH`. Pin insets are summed from these same numbers
 * (see `pinOffset`), so applying this width to pinned header cells keeps
 * stacked pins flush — a natural-width pinned column would otherwise render
 * narrower or wider than the inset math assumed.
 *
 * @param column - The pinned column.
 * @param widths - Resize overrides from the column layout.
 *
 * @public
 */
export function pinnedColumnWidth(
  column: WidthColumn,
  widths?: Readonly<Record<string, number>>
): number {
  return resolveColumnWidth(column, widths) ?? FALLBACK_PIN_WIDTH;
}
