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

import { NativeFilterChips } from "./filters/NativeFilterChips";
import { NativeFiltersPanel } from "./filters/NativeFiltersPanel";

/** Native filter fields and an anchored native popover or modal drawer. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(NativeFiltersPanel)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) =>
      h(NativeFilterChips, { ...props })
    ),
  ]);
}
export { NativeChecklistFilter as ChecklistFilter } from "./filters/NativeChecklistFilter";
export { NativeFilterField } from "./filters/NativeFilterField";
export { NativeFilterTree as FilterTreeBuilder } from "./filters/NativeFilterTree";
export type { FilterDef } from "@adapttable/vue";
export type { FilterOption, FilterTypeSpec } from "@adapttable/vue";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
