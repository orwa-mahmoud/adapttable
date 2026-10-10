import type { FilterDef, TableFeature } from "@adapttable/vue";
import {
  ACTIVE_FILTER_CHIPS,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/vue/adapter";
import {
  filters as bindingFilters,
  type FiltersOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { QuasarFilterChips } from "./filters/QuasarFilterChips";
import { QuasarFiltersPanel } from "./filters/QuasarFiltersPanel";
/** Quasar filter presentation; all queries and lifecycle transitions stay in the binding. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(QuasarFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(QuasarFilterChips, { ...props })
    ),
  ]);
}
export { default as ChecklistFilter } from "./filters/QuasarChecklistFilter.vue";
export { default as QuasarFilterField } from "./filters/QuasarFilterField.vue";
export { default as FilterTreeBuilder } from "./filters/QuasarFilterTree.vue";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
