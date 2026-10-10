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

import { NuxtFilterChips } from "./filters/NuxtFilterChips";
import NuxtFiltersPanel from "./filters/NuxtFiltersPanel.vue";

/** Nuxt UI filter fields and vendor-managed popover or modal drawer. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(NuxtFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(NuxtFilterChips, { ...props })
    ),
  ]);
}
export { default as ChecklistFilter } from "./filters/NuxtChecklistFilter.vue";
export { default as NuxtFilterField } from "./filters/NuxtFilterField.vue";
export { default as FilterTreeBuilder } from "./filters/NuxtFilterTree.vue";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
