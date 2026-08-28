/**
 * A column's cell as plain text.
 *
 * Everything that is not the rendered cell needs this and cannot use
 * `accessor`, because `accessor` returns a `ReactNode`: a status badge is a
 * React element, an avatar cell is a component, and neither is a word. So a
 * screen-reader announcement, an `aria-label`, a tooltip, or a clipboard copy
 * has nothing to read — which is exactly the hole that showed up the moment
 * the grid focus model had to say a cell out loud.
 *
 * Text is always available here. The order goes from most deliberate to most
 * inferred:
 *
 * 1. `formatValue` — the column stating its own text.
 * 2. `exportValue` — already the underlying value, minus the formatting.
 * 3. `sortValue` — a primitive by definition.
 * 4. `accessor` — used only when it happens to return a primitive.
 * 5. the key's data path — but ONLY for a column that renders no cell of its
 *    own, because that is the only case where the path is what is on screen.
 *
 * That last restriction is the whole accessibility point. A column with
 * `accessor: () => null` renders an empty cell; reading its data path would
 * announce a value the user cannot see, which is worse than announcing
 * nothing. Such a column gets `""` — and the fix is to give it a
 * `formatValue`, which is exactly what the field is for.
 */
import type { ColumnDef } from "../types";
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
 * @typeParam TRow - The row type.
 * @param column - The column being read.
 * @param row - The row being read.
 * @returns The cell as text, or `""` when the column holds nothing readable.
 *
 * @public
 */
export function columnText<TRow>(column: ColumnDef<TRow>, row: TRow): string {
  if (column.formatValue) return column.formatValue(row);

  // A column that renders its own cell does not get the data path as a
  // fallback: the path is not what is on screen. `resolveColumns` generates an
  // accessor FROM the path for a bare `{ key }` column, so that case is
  // already covered by the accessor branch.
  const rendersOwnCell = Boolean(column.accessor ?? column.Cell);
  const candidates = [
    column.exportValue?.(row),
    column.sortValue?.(row),
    column.accessor?.(row),
    rendersOwnCell ? undefined : getPath(row, column.key),
  ];
  for (const candidate of candidates) {
    const text = asText(candidate);
    // An empty string is a real answer — a column that says "nothing here"
    // must not fall through to a data path that says something else.
    if (text !== undefined) return text;
  }
  return "";
}
