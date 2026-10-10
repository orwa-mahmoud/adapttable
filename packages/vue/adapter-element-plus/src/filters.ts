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

import { ElementFilterChips } from "./filters/ElementFilterChips";
import { ElementFiltersPanel } from "./filters/ElementFiltersPanel";

export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(ElementFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(ElementFilterChips, { ...props })
    ),
  ]);
}

export { ElementChecklistFilter as ChecklistFilter } from "./filters/ElementChecklistFilter";
export { default as FilterField } from "./filters/ElementFilterField.vue";
export { ElementFilterTree as FilterTreeBuilder } from "./filters/ElementFilterTree";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
