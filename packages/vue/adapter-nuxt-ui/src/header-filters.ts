import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import NuxtHeaderFilter from "./filters/NuxtHeaderFilter.vue";
/** Column popovers use the same binding-owned filter fields as the toolbar. */
export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(NuxtHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/NuxtFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/NuxtFilterHeaderRow.vue";
export { default as NuxtHeaderFilter } from "./filters/NuxtHeaderFilter.vue";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
