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

import { GroupHeaderCard, GroupHeaderCell } from "./components/grouping";

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
    slotRender(GROUP_HEADER_ROW, (props) => (
      <GroupHeaderCell
        {...(props as unknown as Parameters<typeof GroupHeaderCell>[0])}
      />
    )),
    slotRender(GROUP_HEADER_CARD, (props) => (
      <GroupHeaderCard
        {...(props as unknown as Parameters<typeof GroupHeaderCard>[0])}
      />
    )),
  ]);
}

export type { GroupSort };
