/**
 * Declarative filters — `@adapttable/angular-cdk/filters`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  type FilterDef,
  slotRender,
} from "@adapttable/angular";
import {
  ACTIVE_FILTER_CHIPS,
  coreFilters,
  FILTER_DRAWER,
  FILTER_POPOVER,
  FILTERS_FORM,
} from "@adapttable/angular/adapter";
import {
  AdaptFilterChips,
  AdaptFilterDrawer,
  AdaptFilterPopover,
  AdaptFiltersForm,
} from "@adapttable/angular-cdk";

/**
 * Declarative filters: the Filters button with an anchored popover (or the
 * drawer, with `filtersMode="drawer"`), the nested AND/OR builder, one
 * native field per definition, and removable chips for what is active.
 *
 * @param defs - The filter definitions. Columns that declare `filter` add
 *   theirs.
 *
 * @public
 */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = []
): AdaptTableFeature {
  return extendFeature(coreFilters(defs), [
    slotRender(FILTERS_FORM, () => AdaptFiltersForm),
    slotRender(FILTER_POPOVER, () => AdaptFilterPopover),
    slotRender(FILTER_DRAWER, () => AdaptFilterDrawer),
    slotRender(ACTIVE_FILTER_CHIPS, () => AdaptFilterChips),
  ]);
}

export { filterTypes } from "@adapttable/angular/features";
