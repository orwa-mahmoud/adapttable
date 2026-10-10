import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  headerFilterSlotKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { headerFilters as bindingHeaderFilters } from "@adapttable/vue/features";
import { h } from "vue";

import NaiveHeaderFilter from "./filters/NaiveHeaderFilter.vue";

export function headerFilters(): StaticTableFeature {
  return extendFeature(bindingHeaderFilters(), [
    slotRender(headerFilterSlotKey<unknown>(), (props) =>
      h(NaiveHeaderFilter, { ...props })
    ),
  ]);
}

export { default as FilterHeaderControl } from "./filters/NaiveFilterHeaderControl.vue";
export { default as FilterHeaderRow } from "./filters/NaiveFilterHeaderRow.vue";
export { default as NaiveHeaderFilter } from "./filters/NaiveHeaderFilter.vue";
export type {
  FilterHeaderControlOptions,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
