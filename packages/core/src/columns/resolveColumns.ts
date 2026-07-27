import type { ColumnDef } from "../types";
import { humanizeKey } from "../utils/humanizeKey";
import { resolveLocaleTag } from "../utils/localeTag";
import { getPath } from "../utils/path";

/** Cell content from a dot-path value: primitives render, anything else does not. */
function pathCell(value: unknown): string | null {
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
 * The data path a column reads for the active locale: the exact locale tag
 * first (`"ar-EG"`), then its primary subtag (`"ar"`), then the key itself.
 * Works for flat per-language fields and nested objects alike — both are
 * just paths.
 */
export function localizedColumnPath(
  column: Pick<ColumnDef<unknown>, "key" | "i18n">,
  locale: string | undefined
): string {
  if (!column.i18n || !locale) return column.key;
  // The SAME resolution the label presets use (case- and separator-
  // insensitive, exact tag then primary subtag) — `"ar_EG"` must not get
  // Arabic labels while missing the Arabic data paths.
  const tag = resolveLocaleTag(Object.keys(column.i18n), locale);
  return (tag !== undefined ? column.i18n[tag] : undefined) ?? column.key;
}

/**
 * Fill a column's declarative defaults: a missing `header` is humanized from
 * the key, and a column without `accessor`/`Cell` reads the row by its
 * locale-resolved data path (`i18n` map, else `key` — dot paths reach nested
 * values). Client-side sorting follows the generated accessor, so localized
 * columns sort by the localized text. Already-complete columns pass through
 * untouched, so the resolution is idempotent and cheap to repeat.
 */
export function resolveColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  locale?: string
): ColumnDef<TRow>[] {
  return columns.map((column) => {
    const needsHeader = column.header === undefined;
    const needsAccessor = !column.accessor && !column.Cell;
    if (!needsHeader && !needsAccessor) return column;
    const path = localizedColumnPath(column, locale);
    return {
      ...column,
      header: needsHeader ? humanizeKey(column.key) : column.header,
      accessor: needsAccessor
        ? (row: TRow) => pathCell(getPath(row, path))
        : column.accessor,
    };
  });
}
