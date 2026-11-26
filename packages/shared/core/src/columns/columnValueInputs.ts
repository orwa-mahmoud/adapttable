/**
 * What each column's value is read from, as plain data a query fingerprint
 * can compare.
 *
 * A column keeps its key while its value moves: a new `i18n` path, or a
 * `sortValue`, `formatValue`, `exportValue` or `accessor` that reads another
 * field. Hosts also rebuild their columns, and the callbacks on them, on every
 * render. So a path is compared by value and a callback by its source text:
 * swapping in a different function re-evaluates, rebuilding the same one does
 * not.
 */
import type { ColumnMetadata } from "../contracts/columns";

/** A callback's source text, or `null` when the column has none. */
function callbackText(callback: unknown): string | null {
  return typeof callback === "function"
    ? Function.prototype.toString.call(callback)
    : null;
}

/** One entry per column, in column order, of the inputs its value reads. */
export function columnValueInputs<TRow>(
  columns: readonly ColumnMetadata<TRow>[] | undefined
): readonly unknown[] {
  return (columns ?? []).map((column) => [
    column.key,
    column.i18n ?? null,
    callbackText(column.accessor),
    callbackText(column.sortValue),
    callbackText(column.formatValue),
    callbackText(column.exportValue),
  ]);
}
