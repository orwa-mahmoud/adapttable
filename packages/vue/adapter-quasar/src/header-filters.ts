import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import QuasarHeaderFilter from "./filters/QuasarHeaderFilter.vue";
/** Column popovers use the same binding-owned filter fields as the toolbar. */
export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(QuasarHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/QuasarFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/QuasarFilterHeaderRow.vue";
export { default as QuasarHeaderFilter } from "./filters/QuasarHeaderFilter.vue";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
