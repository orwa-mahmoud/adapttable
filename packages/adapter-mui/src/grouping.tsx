import {
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { grouping as core, type GroupSort } from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

/**
 * Group rows under collapsible headers, drawn with MUI's own row and card.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: {
    onGroupByChange?: (groupBy: readonly string[]) => void;
    groupAggregates?: (rows: readonly TRow[]) => unknown;
    groupFooters?: boolean;
    groupSort?: GroupSort<TRow>;
    groupPageSize?: number;
    groupRowPageSize?: number;
    groupFilter?: (group: unknown) => boolean;
    collapsedGroupIds?: readonly string[];
    onCollapsedGroupIdsChange?: (ids: string[]) => void;
    onGroupLoadMore?: (groupKey: string) => void;
  }
): TableFeature<TRow> {
  return extendFeature(core(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupHeaderRow {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupHeaderCard {...props} />),
  ]);
}

export type { GroupSort };
