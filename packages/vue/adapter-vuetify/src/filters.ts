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

import { VuetifyFilterChips } from "./filters/VuetifyFilterChips";
import { VuetifyFiltersPanel } from "./filters/VuetifyFiltersPanel";
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
      slotRender(FILTERS_PANEL, () => h(VuetifyFiltersPanel, { widgets })),
      slotRender(ACTIVE_FILTER_CHIPS, (props) =>
        h(VuetifyFilterChips, { ...props })
      ),
    ]);
}

/** Declarative filters with this kit's chip strip, panel and every widget. @public */
export const filters = /* @__PURE__ */ filtersWith(FILTER_WIDGETS);

export { VuetifyChecklistFilter as ChecklistFilter } from "./filters/VuetifyChecklistFilter";
export { default as VuetifyFilterField } from "./filters/VuetifyFilterField.vue";
export { VuetifyFilterTree as FilterTreeBuilder } from "./filters/VuetifyFilterTree";
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
export type { FiltersOptions } from "@adapttable/vue/features";
export { filterTypes } from "@adapttable/vue/features";
