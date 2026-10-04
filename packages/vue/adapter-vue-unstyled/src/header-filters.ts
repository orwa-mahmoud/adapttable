import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  headerFilters as bindingHeaderFilters,
  headerFilterSlotKey,
} from "@adapttable/vue/header-filters";
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
export { NativeHeaderFilter } from "./filters/NativeHeaderFilter";
