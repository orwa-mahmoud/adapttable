import type { FilterDef, TableFeature } from "@adapttable/vue";
import {
  ACTIVE_FILTER_CHIPS,
  type ActiveFilterChipsSlotProps,
  type AdapterFiltersFeature,
  extendFeature,
  FILTERS_PANEL,
  filterViewKey,
  type FilterWidget,
  slotRender,
  useDataTableClassNames,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { filters as bindingFilters } from "@adapttable/vue/features";
import { defineComponent, h, type PropType } from "vue";

import { FilterChips } from "./filters/FilterChips";
import { WidgetFilterPanel } from "./filters/FilterPanel";
import { FILTER_WIDGETS } from "./filters/widgets";

function useShadcnFilterPanel(props: {
  readonly widgets: readonly FilterWidget[];
}) {
  const widgets = props.widgets;
  const model = useFeatureState(filterViewKey());
  const names = useDataTableClassNames();
  return () =>
    model.value
      ? h(WidgetFilterPanel, {
          model: model.value,
          classNames: names.value,
          widgets,
        })
      : null;
}

const PanelFeatureControl = defineComponent({
  name: "ShadcnFilterPanelFeature",
  props: {
    /** The widgets the panel draws its fields with. */
    widgets: {
      type: Array as PropType<readonly FilterWidget[]>,
      required: true,
    },
  },
  setup: useShadcnFilterPanel,
});
const ChipsFeatureControl = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useDataTableClassNames();
    return () => h(FilterChips, { ...props, classNames: names.value });
  },
  {
    name: "ShadcnFilterChipsFeature",
    props: {
      chips: { type: Array as PropType<ActiveFilterChipsSlotProps["chips"]> },
      labels: {
        type: Object as PropType<ActiveFilterChipsSlotProps["labels"]>,
      },
      onClearAll: {
        type: Function as PropType<ActiveFilterChipsSlotProps["onClearAll"]>,
      },
    },
  }
);

export type FiltersOptions = NonNullable<Parameters<typeof bindingFilters>[1]>;
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
      slotRender(FILTERS_PANEL, () => h(PanelFeatureControl, { widgets })),
      slotRender(ACTIVE_FILTER_CHIPS, (props) => h(ChipsFeatureControl, props)),
    ]);
}

/** Full kit-native presentation around the binding-owned filter feature. @public */
export const filters = /* @__PURE__ */ filtersWith(FILTER_WIDGETS);

export type { BasicFilterFieldProps } from "./filters/BasicFilterField";
export { BasicFilterField } from "./filters/BasicFilterField";
export { ChecklistFilter } from "./filters/ChecklistFilter";
export type { FilterChipsProps } from "./filters/FilterChips";
export { FilterChips } from "./filters/FilterChips";
export { FilterField } from "./filters/FilterField";
export type { FilterPanelProps } from "./filters/FilterPanel";
export { FilterPanel } from "./filters/FilterPanel";
export { FilterTree } from "./filters/FilterTree";
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
export { filterTypes } from "@adapttable/vue/features";
