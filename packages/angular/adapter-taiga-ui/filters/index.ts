import {
  type AdaptTableFeature,
  extendFeature,
  type FilterDef,
  slotRender,
} from "@adapttable/angular";
import {
  ACTIVE_FILTER_CHIPS,
  type AdapterFiltersFeature,
  coreFilters,
  FILTER_DRAWER,
  FILTER_POPOVER,
  type FilterPanelOptions,
  FILTERS_FORM,
  type FilterWidget,
  withFilterWidgets,
} from "@adapttable/angular/adapter";
import {
  AdaptFilterChips,
  AdaptFilterDrawer,
  AdaptFilterPopover,
  AdaptFiltersForm,
  booleanFilterWidget,
  checklistFilterWidget,
  multiSelectFilterWidget,
  rangeFilterWidget,
  selectFilterWidget,
  textFilterWidget,
} from "@adapttable/taiga-ui";

/**
 * Declarative filters — `@adapttable/taiga-ui/filters`.
 *
 * @packageDocumentation
 */

/**
 * Declarative filters whose fields are drawn with only the given widgets, so
 * the widgets a table never shows stay out of its bundle. A filter whose
 * widget is missing throws when its field draws.
 *
 * @param widgets - The widgets to draw fields with, such as `textFilterWidget`.
 *
 * @public
 */
export function filtersWith(
  widgets: readonly FilterWidget[]
): AdapterFiltersFeature {
  return <TRow>(
    defs: readonly FilterDef<TRow>[] = [],
    options?: FilterPanelOptions
  ): AdaptTableFeature =>
    withFilterWidgets(
      extendFeature(coreFilters(defs, options), [
        slotRender(FILTERS_FORM, () => AdaptFiltersForm),
        slotRender(FILTER_POPOVER, () => AdaptFilterPopover),
        slotRender(FILTER_DRAWER, () => AdaptFilterDrawer),
        slotRender(ACTIVE_FILTER_CHIPS, () => AdaptFilterChips),
      ]),
      widgets
    );
}

/** Every widget: what `filters` draws its fields with. */
const everyWidget = /* @__PURE__ */ filtersWith([
  textFilterWidget,
  booleanFilterWidget,
  selectFilterWidget,
  multiSelectFilterWidget,
  checklistFilterWidget,
  rangeFilterWidget,
]);

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
  defs?: readonly FilterDef<TRow>[],
  options?: FilterPanelOptions
): AdaptTableFeature {
  return everyWidget(defs, options);
}

export {
  booleanFilterWidget,
  checklistFilterWidget,
  multiSelectFilterWidget,
  rangeFilterWidget,
  selectFilterWidget,
  textFilterWidget,
};
export type {
  AdapterFiltersFeature,
  FilterWidget,
} from "@adapttable/angular/adapter";
export { filterTypes } from "@adapttable/angular/features";
