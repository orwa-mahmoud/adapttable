/**
 * Filter-form contracts used by the engine. Widget hooks live on
 * `@adapttable/react`.
 */
import type { FilterValue } from "../columnModel";
import type { TableSource } from "../source/TableSource";

/**
 * The slice of the table source the auto-built filter form reads and writes.
 *
 * @public
 */
export type FilterFormSource<TRow> = Pick<
  TableSource<TRow>,
  "extra" | "setExtra" | "setExtras" | "allFilteredRows" | "facets"
>;

/**
 * A multi-select value as a list — tolerating a scalar from the URL.
 *
 * @public
 */
export function listFilterValues(value: FilterValue): string[] {
  if (Array.isArray(value)) return [...value];
  return value == null || value === "" ? [] : [String(value)];
}
