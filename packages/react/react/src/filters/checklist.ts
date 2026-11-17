/**
 * Excel-style checklist filter — distinct values, counts, search,
 * select-all. Prefers `TableSource.facets` (own-filter excluded);
 * falls back to `TableSource.allFilteredRows`. A server page that
 * omits both does not offer the widget.
 */
import {
  CHECKLIST_VIRTUALIZE_AT,
  type FilterDef,
  listFilterValues,
  type TableSource,
} from "@adapttable/core";
import {
  checklistActions,
  type ChecklistFilterState,
  checklistItems,
  searchChecklistItems,
} from "@adapttable/core/binding";
import { useMemo, useState } from "react";
export type { ChecklistValue } from "@adapttable/core";
export {
  CHECKLIST_ITEM_HEIGHT,
  CHECKLIST_LIST_HEIGHT,
  CHECKLIST_VIRTUALIZE_AT,
} from "@adapttable/core";
export { collectChecklistValues } from "@adapttable/core";
export type { ChecklistFilterState } from "@adapttable/core/binding";

/**
 * Derive the checklist from `source.facets` or `source.allFilteredRows`.
 * Returns `available: false` when both are missing so a server page
 * never pretends it can count a set it does not hold.
 *
 * @public
 */
export function useChecklistFilter<TRow>(
  def: FilterDef<TRow>,
  source: Pick<
    TableSource<TRow>,
    "allFilteredRows" | "extra" | "setExtra" | "facets"
  >
): ChecklistFilterState {
  const fromFacets = source.facets?.[def.key];
  const rows = source.allFilteredRows;
  const raw = source.extra[def.key];
  const { available, items } = useMemo(
    () =>
      checklistItems(def, {
        facets: fromFacets ? { [def.key]: fromFacets } : undefined,
        allFilteredRows: rows,
        extra: { [def.key]: raw },
      }),
    [def, rows, raw, fromFacets]
  );
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => searchChecklistItems(items, query),
    [items, query]
  );
  return {
    available,
    items,
    visible,
    query,
    setQuery,
    selected: listFilterValues(raw),
    virtualize: visible.length >= CHECKLIST_VIRTUALIZE_AT,
    ...checklistActions(def, source, visible),
  };
}
