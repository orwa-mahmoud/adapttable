import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
  useDataTableClassNames,
  type VueHeaderFilterControlProps,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { defineComponent, h } from "vue";

import { HeaderFilter } from "./filters/HeaderFilter";

const HeaderFeatureControl = defineComponent(
  (props: VueHeaderFilterControlProps<unknown>) => {
    const names = useDataTableClassNames();
    return () => h(HeaderFilter, { ...props, classNames: names.value });
  },
  {
    name: "ShadcnHeaderFeatureControl",
    props: [
      "def",
      "source",
      "labels",
      "registry",
      "className",
      "closeOnSelect",
      "dir",
    ],
  }
);

export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey(), (props) =>
      h(HeaderFeatureControl, props)
    ),
  ]);
}
export { FilterHeaderControl } from "./filters/FilterHeaderControl";
export { FilterHeaderRow } from "./filters/FilterHeaderRow";
export type { HeaderFilterProps } from "./filters/HeaderFilter";
export { HeaderFilter } from "./filters/HeaderFilter";
export type {
  FilterHeaderControlOptions,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
