import { type StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import AntdHeaderFilter from "./filters/AntdHeaderFilter.vue";

/** Element anchored column filters share the binding's lifecycle and field models. */
export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(AntdHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/AntdFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/AntdFilterHeaderRow.vue";
export { AntdHeaderFilter };
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
