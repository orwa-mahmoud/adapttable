import { type StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import ElementHeaderFilter from "./filters/ElementHeaderFilter.vue";

/** Element anchored column filters share the binding's lifecycle and field models. */
export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(ElementHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/ElementFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/ElementFilterHeaderRow.vue";
export { ElementHeaderFilter };
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
