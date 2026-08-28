/**
 * Facet counts — what selecting a value WOULD give, which is the
 * filtered set with this facet's own filter removed (#281).
 */
import type { ExtraFilters } from "../types";
import { type ChecklistValue, collectChecklistValues } from "./checklist";
import type { FilterDef } from "./filterDefs";
import { listFilterValues } from "./filterForm";
import type { FilterTypeRegistry } from "./filterRegistry";

/**
 * Distinct values + counts for one filter key.
 *
 * @public
 */
export type FacetCounts = readonly ChecklistValue[];

/**
 * Facet counts keyed by filter key.
 *
 * @public
 */
export type FacetMap = Readonly<Record<string, FacetCounts>>;

/**
 * Rows that still match after every filter except `key`. The count on
 * each remaining value is "how many rows you would keep if you picked
 * it", not "how many remain after you already picked it".
 *
 * @public
 */
export function rowsExcludingFilter<TRow>(
  rows: readonly TRow[],
  extra: ExtraFilters,
  key: string,
  filterFn: (row: TRow, extra: ExtraFilters) => boolean
): readonly TRow[] {
  const cleared: ExtraFilters = { ...extra, [key]: undefined };
  return rows.filter((row) => filterFn(row, cleared));
}

/**
 * Facet counts for every `checklist` definition. Other types are
 * ignored — they do not show per-value counts.
 *
 * @public
 */
export function computeFilterFacets<TRow>(
  defs: readonly FilterDef<TRow>[],
  rows: readonly TRow[],
  extra: ExtraFilters,
  filterFn: (row: TRow, extra: ExtraFilters) => boolean,
  registry?: FilterTypeRegistry
): FacetMap {
  const out: Record<string, ChecklistValue[]> = {};
  for (const def of defs) {
    const widget = registry?.get(def.type)?.widget ?? def.type;
    if (widget !== "checklist") continue;
    const subset = rowsExcludingFilter(rows, extra, def.key, filterFn);
    out[def.key] = collectChecklistValues(
      def,
      subset,
      listFilterValues(extra[def.key])
    );
  }
  return out;
}
