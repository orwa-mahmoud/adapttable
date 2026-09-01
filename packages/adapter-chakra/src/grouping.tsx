import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  grouping as core,
  type GroupingExtras,
  type GroupSort,
  type StaticGroupingExtras,
} from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

export function grouping(
  groupBy: string | readonly string[],
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow>
): TableFeature<TRow>;
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow> {
  return extendFeature(core<TRow>(groupBy, extras ?? {}), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupHeaderRow {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupHeaderCard {...props} />),
  ]);
}

export type { GroupSort };
