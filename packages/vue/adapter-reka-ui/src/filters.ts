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

import { RekaFilterChips } from "./filters/RekaFilterChips";
import { RekaFiltersPanel } from "./filters/RekaFiltersPanel";

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(RekaFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => h(RekaFilterChips, props)),
  ]);
}

export { default as ChecklistFilter } from "./filters/ChecklistFilter.vue";
export { default as FilterField } from "./filters/FilterField.vue";
export { default as FilterTreeBuilder } from "./filters/FilterTreeBuilder.vue";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export { type FiltersOptions, filterTypes } from "@adapttable/vue/features";
