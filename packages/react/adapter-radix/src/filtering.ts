/**
 * The filtering family — `@adapttable/radix/filtering`.
 *
 * Its own entry, so a table that imports `filters` or `headerFilters` alone
 * loads that member alone.
 */
import { createAdapterFilteringFamily } from "@adapttable/react/adapter";

import { filters } from "./filters";
import { headerFilters } from "./header-filters";

/**
 * All of filtering — the filter panel for the given definitions and the
 * header controls — with this kit's controls, passed to `features` as one
 * entry.
 *
 * @public
 */
export const filteringFamily = /* @__PURE__ */ createAdapterFilteringFamily({
  filters,
  headerFilters,
});
