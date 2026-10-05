import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/vue/adapter";
import {
  type GroupingExtras,
  groupingPanel as bindingGroupingPanel,
  groupingPanelControlKey,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h } from "vue";

import { grouping } from "./grouping";
import NativeGroupingPanel from "./grouping/NativeGroupingPanel.vue";
export type {
  GroupingExtras,
  GroupingPanelProps,
} from "@adapttable/vue/features";
export function groupingPanel(
  initialGroupBy?: string | readonly string[],
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function groupingPanel<TRow>(
  initialGroupBy?: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow>;
export function groupingPanel<TRow>(
  initialGroupBy?: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  const ordinary = grouping<TRow>([], extras);
  return extendFeature(bindingGroupingPanel<TRow>(initialGroupBy, extras), [
    ...(ordinary.renders ?? []),
    slotRender(groupingPanelControlKey<TRow>(), (props) =>
      h(NativeGroupingPanel<TRow>, { ...props })
    ),
  ]);
}
