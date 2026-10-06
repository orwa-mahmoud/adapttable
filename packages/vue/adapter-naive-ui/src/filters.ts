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

import { NaiveFilterChips } from "./filters/NaiveFilterChips";
import { NaiveFiltersPanel } from "./filters/NaiveFiltersPanel";

/** Naive fields and vendor overlays over the binding's filter state. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(NaiveFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(NaiveFilterChips, { ...props })
    ),
  ]);
}

export { default as ChecklistFilter } from "./filters/NaiveChecklistFilter.vue";
export { default as NaiveFilterField } from "./filters/NaiveFilterField.vue";
export { default as FilterTreeBuilder } from "./filters/NaiveFilterTree.vue";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
