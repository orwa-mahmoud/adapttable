import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  rowPinning as bindingRowPinning,
  type RowPinningFeatureOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { rowActionsControlKey } from "./rowActionsSlot";
import QuasarRowActions from "./table/QuasarRowActions.vue";

/** Pin controls share the same single native action presentation as rowActions(). */
export function rowPinning(
  options: RowPinningFeatureOptions = {}
): StaticTableFeature {
  return extendFeature(bindingRowPinning(options), [
    slotRender(rowActionsControlKey<unknown>(), (props) =>
      h(QuasarRowActions<unknown>, props)
    ),
  ]);
}
export type { RowPinningFeatureOptions } from "@adapttable/vue/features";
