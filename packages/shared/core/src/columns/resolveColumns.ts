import type { ColumnModel } from "../columnModel";
import { humanizeKey } from "../utils/humanizeKey";
import { resolveLocaleTag } from "../utils/localeTag";
import { getPath } from "../utils/path";

/**
 * The data path a column reads for the active locale: the exact locale tag
 * first (`"ar-EG"`), then its primary subtag (`"ar"`), then the key itself.
 *
 * @public
 */
export function localizedColumnPath(
  column: Pick<ColumnModel<unknown>, "key" | "i18n">,
  locale: string | undefined
): string {
  if (!column.i18n || !locale) return column.key;
  const tag = resolveLocaleTag(Object.keys(column.i18n), locale);
  return (tag !== undefined ? column.i18n[tag] : undefined) ?? column.key;
}

/**
 * A value from a column's data path as cell text: strings as is, numbers,
 * booleans and bigints stringified, anything else `null`.
 *
 * @public
 */
export function columnPathText(value: unknown): string | null {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return null;
  }
}

/**
 * What {@link resolveColumnDefaults} reads from a binding's column type.
 *
 * @public
 */
export interface ResolvableColumn<TRow> {
  /** Stable column key, also the default data path. */
  readonly key: string;
  /** Header content, in the binding's own type; absent gets the humanized key. */
  readonly header?: object | string | number | bigint | boolean | symbol | null;
  /** Reads the cell value; missing gets a data-path reader. */
  readonly accessor?: (row: TRow) => unknown;
  /** Display text the column already produces; read before the data path. */
  readonly formatValue?: (row: TRow) => string;
  /** Data path per locale tag. */
  readonly i18n?: NonNullable<ColumnModel<TRow>["i18n"]>;
}

/**
 * Fill a column's declarative defaults: a missing `header` is the key,
 * humanized, and a column without an `accessor` shows its `formatValue` text
 * when it has one — the same text the engine and export read — and otherwise
 * reads the row by its locale-resolved data path. Complete columns are
 * returned unchanged.
 *
 * @param columns - The declared columns, in any binding's column type.
 * @param locale - The active locale.
 * @param rendersItself - Whether a column draws its own cell, so needs no
 *   generated accessor (React's `Cell`, for example).
 * @returns The columns with their defaults filled.
 *
 * @public
 */
export function resolveColumnDefaults<
  TRow,
  TColumn extends ResolvableColumn<TRow>,
>(
  columns: readonly TColumn[],
  locale?: string,
  rendersItself: (column: TColumn) => boolean = () => false
): TColumn[] {
  return columns.map((column) => {
    const needsHeader = column.header === undefined;
    const needsAccessor = !column.accessor && !rendersItself(column);
    if (!needsHeader && !needsAccessor) return column;
    const path = localizedColumnPath(column, locale);
    const generated =
      column.formatValue ?? ((row: TRow) => columnPathText(getPath(row, path)));
    return {
      ...column,
      header: needsHeader ? humanizeKey(column.key) : column.header,
      accessor: needsAccessor ? generated : column.accessor,
    };
  });
}

/**
 * Columns with the header default only: a missing `header` is the key,
 * humanized. No accessor is generated.
 *
 * @public
 */
export function resolveColumnHeaders<
  TColumn extends { key: string; header?: unknown },
>(columns: readonly TColumn[]): TColumn[] {
  return columns.map((column) =>
    column.header === undefined
      ? { ...column, header: humanizeKey(column.key) }
      : column
  );
}
