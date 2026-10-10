import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import VuetifyHeaderFilter from "./filters/VuetifyHeaderFilter.vue";

export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(VuetifyHeaderFilter, { ...props })
    ),
  ]);
}
export { default as FilterHeaderControl } from "./filters/VuetifyFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/VuetifyFilterHeaderRow.vue";
export { default as VuetifyHeaderFilter } from "./filters/VuetifyHeaderFilter.vue";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
