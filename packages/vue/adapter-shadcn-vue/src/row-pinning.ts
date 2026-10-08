import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature } from "@adapttable/vue/adapter";
import {
  rowPinning as bindingRowPinning,
  type RowPinningFeatureOptions,
} from "@adapttable/vue/features";

import { shadcnRowActionsRender } from "./rows/render";

export function rowPinning(
  options: RowPinningFeatureOptions = {}
): StaticTableFeature {
  return extendFeature(bindingRowPinning(options), [shadcnRowActionsRender]);
}
export type { RowPinningFeatureOptions } from "@adapttable/vue/features";
