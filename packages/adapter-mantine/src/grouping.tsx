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
  type StaticGroupingExtras,
} from "@adapttable/core/features";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

/**
 * Group rows under collapsible headers, drawn with Mantine's own row and card.
 *
 * @public
 */
export function grouping(
  groupBy: string | readonly string[],
  extras?: StaticGroupingExtras
): StaticTableFeature;
/**
 * Group rows with row-aware extras.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow>
): TableFeature<TRow>;
/**
 * Group rows under collapsible headers.
 *
 * @public
 */
export function grouping<TRow>(
  groupBy: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow> {
  return extendFeature(core<TRow>(groupBy, extras ?? {}), [
    slotRender(GROUP_HEADER_ROW, (props) => <GroupHeaderRow {...props} />),
    slotRender(GROUP_HEADER_CARD, (props) => <GroupHeaderCard {...props} />),
  ]);
}

export type { GroupSort } from "@adapttable/core/features";
