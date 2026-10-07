import type { FilterDef, TableFeature } from "@adapttable/vue";
import {
  ACTIVE_FILTER_CHIPS,
  type ActiveFilterChipsSlotProps,
  extendFeature,
  filterViewKey,
  slotRender,
  TOOLBAR_EXTRAS,
  useDataTableClassNames,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { filters as bindingFilters } from "@adapttable/vue/features";
import { defineComponent, h } from "vue";

import { FilterChips } from "./filters/FilterChips";
import { FilterPanel } from "./filters/FilterPanel";

const PanelFeatureControl = defineComponent({
  name: "ShadcnFilterPanelFeature",
  setup() {
    const model = useFeatureState(filterViewKey());
    const names = useDataTableClassNames();
    return () =>
      model.value
        ? h(FilterPanel, { model: model.value, classNames: names.value })
        : null;
  },
});
const ChipsFeatureControl = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useDataTableClassNames();
    return () => h(FilterChips, { ...props, classNames: names.value });
  },
  { name: "ShadcnFilterChipsFeature", props: ["chips", "labels", "onClearAll"] }
);

export type FiltersOptions = NonNullable<Parameters<typeof bindingFilters>[1]>;
/** Full kit-native presentation around the binding-owned filter feature. */
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  return extendFeature(bindingFilters(defs, options), [
    slotRender(TOOLBAR_EXTRAS, () => h(PanelFeatureControl)),
    slotRender(ACTIVE_FILTER_CHIPS, (props) => h(ChipsFeatureControl, props)),
  ]);
}
export type { BasicFilterFieldProps } from "./filters/BasicFilterField";
export { BasicFilterField } from "./filters/BasicFilterField";
export { ChecklistFilter } from "./filters/ChecklistFilter";
export { FilterChips } from "./filters/FilterChips";
export { FilterField } from "./filters/FilterField";
export type { FilterPanelProps } from "./filters/FilterPanel";
export { FilterPanel } from "./filters/FilterPanel";
export { FilterTree } from "./filters/FilterTree";
export type {
  ChecklistFilterProps,
  FilterTreeBuilderProps,
} from "@adapttable/vue/adapter";
