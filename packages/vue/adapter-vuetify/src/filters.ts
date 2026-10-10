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

import { VuetifyFilterChips } from "./filters/VuetifyFilterChips";
import { VuetifyFiltersPanel } from "./filters/VuetifyFiltersPanel";

/** Vuetify controls and overlays over the shared filter state. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(VuetifyFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(VuetifyFilterChips, { ...props })
    ),
  ]);
}
export { VuetifyChecklistFilter as ChecklistFilter } from "./filters/VuetifyChecklistFilter";
export { default as VuetifyFilterField } from "./filters/VuetifyFilterField.vue";
export { VuetifyFilterTree as FilterTreeBuilder } from "./filters/VuetifyFilterTree";
export type { FilterDef, FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
