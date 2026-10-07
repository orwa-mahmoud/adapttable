import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  extendFeature,
  groupingPanelControlKey,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  type GroupingExtras,
  groupingPanel as bindingGroupingPanel,
  type StaticGroupingExtras,
} from "@adapttable/vue/features";
import { h } from "vue";

import { grouping } from "./grouping";
import GroupingPanel from "./grouping/GroupingPanel.vue";

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
  return extendFeature(bindingGroupingPanel<TRow>(initialGroupBy, extras), [
    ...(grouping<TRow>([], extras).renders ?? []),
    slotRender(groupingPanelControlKey<TRow>(), (props) =>
      h(GroupingPanel<TRow>, { ...props })
    ),
  ]);
}
export type { GroupingPanelProps } from "@adapttable/vue";
export type {
  GroupingExtras,
  StaticGroupingExtras,
} from "@adapttable/vue/features";
