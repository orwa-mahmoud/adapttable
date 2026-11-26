/**
 * The filtering family — `@adapttable/ng-bootstrap/filtering`.
 *
 * Its own entry, so a table that imports `filters` or `headerFilters` alone
 * loads that member alone.
 */
import type { AdaptTableFeature, FilterDef } from "@adapttable/angular";
import { filteringFamilyList } from "@adapttable/angular/adapter";
import { filters } from "@adapttable/ng-bootstrap/filters";
import { headerFilters } from "@adapttable/ng-bootstrap/header-filters";

/**
 * All of filtering — the filter panel for the given definitions and the
 * header controls — with this kit's controls, passed to `features` as one
 * entry.
 *
 * @public
 */
export function filteringFamily<TRow>(
  defs: readonly FilterDef<TRow>[]
): readonly AdaptTableFeature[] {
  return filteringFamilyList<AdaptTableFeature, FilterDef<TRow>>(
    { filters: (given) => filters(given), headerFilters },
    defs
  );
}
