/**
 * Resolve a cell value from a neutral column. Never reads React renderers.
 */

import type { ColumnMetadata, SortableValue } from "../contracts/columns";
import { resolveLocaleTag } from "../utils/localeTag";
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
 * How a column reads a row, prepared once: the same order as
 * {@link cellValue}, with the `i18n` path resolved here rather than per row.
 */
export function cellValueReader<TRow>(
  column: ColumnMetadata<TRow>,
  locale?: string
): (row: TRow) => unknown {
  const { formatValue, exportValue, sortValue } = column;
  if (formatValue) return (row) => formatValue.call(column, row);
  if (exportValue) return (row) => exportValue.call(column, row);
  if (sortValue) return (row) => sortValue.call(column, row);
  const path = resolveColumnPath(column, locale);
  return (row) => getPath(row, path);
}

/**
 * How a column reads a row's sort key, prepared once: the same answer as
 * {@link cellSortValue}, with the `i18n` path resolved here rather than per
 * row.
 */
export function cellSortReader<TRow>(
  column: ColumnMetadata<TRow>,
  locale?: string
): (row: TRow) => SortableValue {
  const { sortValue } = column;
  if (sortValue) return (row) => sortValue.call(column, row);
  const read = cellValueReader(column, locale);
  return (row) => asSortable(read(row));
}

/**
 * Data path for a column, honouring `i18n` through the one locale resolver
 * every locale-shaped lookup shares (`resolveLocaleTag`): the exact tag in
 * any case and with `-` or `_`, then its primary subtag, then `key`.
 *
 * @public
 */
export function resolveColumnPath<TRow>(
  column: ColumnMetadata<TRow>,
  locale?: string
): string {
  if (!locale || !column.i18n) return column.key;
  const tag = resolveLocaleTag(Object.keys(column.i18n), locale);
  return (tag === undefined ? undefined : column.i18n[tag]) ?? column.key;
}
