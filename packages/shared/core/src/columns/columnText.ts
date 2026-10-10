/**
 * A column's cell as plain text.
 *
 * The engine and accessibility paths read values through format/export/sort
 * extractors, primitive accessors and the column data path. Renderer objects
 * are never stringified or rendered.
 */
import type { ColumnMetadata } from "../columnModel";
import { getPath } from "../utils/path";

/** Primitives read as themselves; a date reads as its ISO day. */
function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return undefined;
}

/**
 * The text for one cell — never `undefined`, so a caller never has to decide
 * what to say when a column declines to answer.
 *
 * @public
 */
export function columnText<TRow>(
  column: ColumnMetadata<TRow>,
  row: TRow
): string {
  if (column.formatValue) return column.formatValue(row);

  const fromExport = column.exportValue?.(row);
  // Retain the existing projection/data read order before examining text.
  const candidates = [column.sortValue?.(row), getPath(row, column.key)];
  const exported = asText(fromExport);
  if (exported !== undefined) return exported;
  // Accessors may return renderer objects; only existing plain-text values qualify.
  const accessed = asText(column.accessor?.(row));
  if (accessed !== undefined) return accessed;
  for (const candidate of candidates) {
    const text = asText(candidate);
    if (text !== undefined) return text;
  }
  return "";
}
