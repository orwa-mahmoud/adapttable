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
import NuxtGroupingPanel from "./grouping/NuxtGroupingPanel.vue";

export type { GroupingPanelProps } from "@adapttable/vue";
export type { GroupingExtras } from "@adapttable/vue/features";

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
      h(NuxtGroupingPanel<TRow>, { ...props })
    ),
  ]);
}
