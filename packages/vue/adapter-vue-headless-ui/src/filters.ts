import type { FilterDef, TableFeature } from "@adapttable/vue";
import {
  ACTIVE_FILTER_CHIPS,
  type AdapterFiltersFeature,
  extendFeature,
  FILTERS_PANEL,
  type FilterWidget,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  filters as bindingFilters,
  type FiltersOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { HeadlessFilterChips } from "./filters/HeadlessFilterChips";
import { HeadlessFiltersPanel } from "./filters/HeadlessFiltersPanel";
import { FILTER_WIDGETS } from "./filters/widgets";

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
    options: FiltersOptions = {}
  ): TableFeature<TRow> =>
    extendFeature(bindingFilters(defs, options), [
      slotRender(FILTERS_PANEL, () => h(HeadlessFiltersPanel, { widgets })),
      slotRender(ACTIVE_FILTER_CHIPS, (props) => h(HeadlessFilterChips, props)),
    ]);
}

/** Declarative filters with this kit's chip strip, panel and every widget. @public */
export const filters = /* @__PURE__ */ filtersWith(FILTER_WIDGETS);

export { default as ChecklistFilter } from "./filters/ChecklistFilter.vue";
export { default as FilterField } from "./filters/FilterField.vue";
export { default as FilterTreeBuilder } from "./filters/FilterTreeBuilder.vue";
export {
  booleanFilterWidget,
  checklistFilterWidget,
  multiSelectFilterWidget,
  rangeFilterWidget,
  selectFilterWidget,
  textFilterWidget,
} from "./filters/widgets";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  AdapterFiltersFeature,
  FilterWidget,
} from "@adapttable/vue/adapter";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export { type FiltersOptions, filterTypes } from "@adapttable/vue/features";
