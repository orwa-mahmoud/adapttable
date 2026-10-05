import {
  ACTIVE_FILTER_CHIPS,
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/vue/adapter";
import {
  type FilterDef,
  filters as bindingFilters,
  type FiltersOptions,
} from "@adapttable/vue/filters";
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
export { NativeChecklistFilter } from "./filters/NativeChecklistFilter";
export { NativeFilterField } from "./filters/NativeFilterField";
export { NativeFilterTree } from "./filters/NativeFilterTree";
export type { FilterDef, FiltersOptions } from "@adapttable/vue/filters";
export type {
  ChecklistFilterProps,
  FilterOption,
  FilterTreeBuilderProps,
  FilterTypeSpec,
} from "@adapttable/vue/filters";
export { filterTypes } from "@adapttable/vue/filters";
