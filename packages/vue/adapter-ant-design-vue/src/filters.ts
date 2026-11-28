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

import { AntdFilterChips } from "./filters/AntdFilterChips";
import { AntdFiltersPanel } from "./filters/AntdFiltersPanel";
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
      slotRender(FILTERS_PANEL, () => h(AntdFiltersPanel, { widgets })),
      slotRender(ACTIVE_FILTER_CHIPS, (props) =>
        h(AntdFilterChips, { ...props })
      ),
    ]);
}

/** Declarative filters with this kit's chip strip, panel and every widget. @public */
export const filters = /* @__PURE__ */ filtersWith(FILTER_WIDGETS);

export { AntdChecklistFilter as ChecklistFilter } from "./filters/AntdChecklistFilter";
export { default as FilterField } from "./filters/AntdFilterField.vue";
export { AntdFilterTree as FilterTreeBuilder } from "./filters/AntdFilterTree";
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
  FilterFieldOptions,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
