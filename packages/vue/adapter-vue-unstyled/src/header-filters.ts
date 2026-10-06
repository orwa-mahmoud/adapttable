import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { type StaticTableFeature } from "@adapttable/vue";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import { NativeHeaderFilter } from "./filters/NativeHeaderFilter";

/** Native anchored column filters share the binding's lifecycle and field models. */
export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(NativeHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/NativeFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/NativeFilterHeaderRow.vue";
export { NativeHeaderFilter } from "./filters/NativeHeaderFilter";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
