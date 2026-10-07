import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import HeaderFilter from "./filters/HeaderFilter.vue";

export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(HeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/FilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/FilterHeaderRow.vue";
export { default as HeaderFilter } from "./filters/HeaderFilter.vue";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
