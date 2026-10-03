/**
 * Declarative filters — `@adapttable/ngx-bootstrap/filters`.
 *
 * @packageDocumentation
 */
import {
  ACTIVE_FILTER_CHIPS,
  type AdaptTableFeature,
  coreFilters,
  extendFeature,
  FILTER_DRAWER,
  FILTER_POPOVER,
  type FilterDef,
  FILTERS_FORM,
  slotRender,
} from "@adapttable/angular";
import {
  AdaptFilterChips,
  AdaptFilterDrawer,
  AdaptFilterPopover,
  AdaptFiltersForm,
} from "@adapttable/ngx-bootstrap";

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

export { filterTypes } from "@adapttable/angular";
