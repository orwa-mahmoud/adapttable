/**
 * Resolve a cell value from a neutral column. Never reads React renderers.
 */
import type { SortableValue, ColumnMetadata } from "../columnModel";
import { getPath } from "../utils/path";

function asSortable(value: unknown): SortableValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  return undefined;
}

/**
 * The value the engine and AI use for a cell. Order: `formatValue`,
 * `exportValue`, `sortValue`, then the key / i18n data path. A React
 * accessor or Cell is never consulted.
 *
 * @public
 */
export function cellValue<TRow>(
  row: TRow,
  column: ColumnMetadata<TRow>,
  locale?: string
): unknown {
  if (column.formatValue) return column.formatValue(row);
  if (column.exportValue) return column.exportValue(row);
  if (column.sortValue) return column.sortValue(row);
  const path = resolveColumnPath(column, locale);
  return getPath(row, path);
}

/**
 * Sort key for one column. Prefers `sortValue`, then a primitive cell value.
 *
 * @public
 */
export function cellSortValue<TRow>(
  row: TRow,
  column: ColumnMetadata<TRow>,
  locale?: string
): SortableValue {
  if (column.sortValue) return column.sortValue(row);
  return asSortable(cellValue(row, column, locale));
}

/**
 * Data path for a column, honouring `i18n` the same way resolveColumns does:
 * exact locale tag, then primary subtag, then `key`.
 *
 * @public
 */
export function resolveColumnPath<TRow>(
  column: ColumnMetadata<TRow>,
  locale?: string
): string {
  if (!locale || !column.i18n) return column.key;
  const exact = column.i18n[locale];
  if (exact) return exact;
  const primary = locale.split("-")[0];
  if (primary && column.i18n[primary]) return column.i18n[primary];
  return column.key;
}
