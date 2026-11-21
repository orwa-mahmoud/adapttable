/**
 * The filtering family — `@adapttable/nuxt-ui/filtering`.
 *
 * Its own entry, so a table that imports `filters` or `headerFilters` alone
 * loads that member alone.
 */
import type { FilterDef, TableFeature } from "@adapttable/vue";
import { filteringFamilyList } from "@adapttable/vue/adapter";

import { filters } from "./filters";
import { headerFilters } from "./header-filters";

/**
 * All of filtering — the filter panel for the given definitions and the
 * header controls — with this kit's controls, passed to `features` as one
 * entry.
 *
 * @public
 */
export function filteringFamily<TRow>(
  defs: readonly FilterDef<TRow>[]
): readonly TableFeature<TRow>[] {
  return filteringFamilyList<TableFeature<TRow>, FilterDef<TRow>>(
    { filters: (given) => filters(given), headerFilters },
    defs
  );
}
