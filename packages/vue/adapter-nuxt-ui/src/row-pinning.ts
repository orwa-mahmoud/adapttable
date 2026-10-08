import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  rowPinning as bindingRowPinning,
  type RowPinningFeatureOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { NuxtRowActions } from "./NuxtRowActions";
import { rowActionsControlKey } from "./rowActionsSlot";

/** Pin controls share the same Nuxt UI action presentation as rowActions(). */
export function rowPinning(
  options: RowPinningFeatureOptions = {}
): StaticTableFeature {
  return extendFeature(bindingRowPinning(options), [
    slotRender(rowActionsControlKey<unknown>(), (props) =>
      h(NuxtRowActions<unknown>, props)
    ),
  ]);
}
