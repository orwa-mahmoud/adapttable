import {
  type FeatureSlotKey,
  featureSlotKey,
  type FeatureStateKey,
  featureStateKey,
} from "@adapttable/core/binding";

import type { GroupingPanelProps } from "./groupingPanel";
import type { RowReorderControlProps, VueRowReorderModel } from "./rowReorder";
import type { BodyWindowModel } from "./virtualize";
export function rowReorderModelKey<TRow>(): FeatureStateKey<
  VueRowReorderModel<TRow>
> {
  return featureStateKey("vue-row-reorder-model");
}
export function rowReorderControlKey<TRow>(): FeatureSlotKey<
  RowReorderControlProps<TRow>
> {
  return featureSlotKey("vue-row-reorder-control", { single: true });
}
export function bodyWindowModelKey<TRow>(): FeatureStateKey<
  BodyWindowModel<TRow>
> {
  return featureStateKey("vue-body-window-model");
}
export function groupingPanelModelKey<TRow>(): FeatureStateKey<
  GroupingPanelProps<TRow>
> {
  return featureStateKey("vue-grouping-panel-model");
}
export function groupingPanelControlKey<TRow>(): FeatureSlotKey<
  GroupingPanelProps<TRow>
> {
  return featureSlotKey("vue-grouping-panel-control", { single: true });
}
