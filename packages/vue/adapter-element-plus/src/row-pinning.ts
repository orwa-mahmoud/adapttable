import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  rowPinning as bindingRowPinning,
  type RowPinningFeatureOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { ElementRowActions } from "./ElementRowActions";
import { rowActionsControlKey } from "./rowActionsSlot";

/** Pin controls share the same single native action presentation as rowActions(). */
export function rowPinning(
  options: RowPinningFeatureOptions = {}
): StaticTableFeature {
  return extendFeature(bindingRowPinning(options), [
    slotRender(rowActionsControlKey<unknown>(), (props) =>
      h(ElementRowActions<unknown>, props)
    ),
  ]);
}
