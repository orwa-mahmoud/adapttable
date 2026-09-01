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

import { GroupHeaderCard, GroupHeaderCell } from "./components/grouping";

/**
 * Group rows under collapsible headers, drawn with Ant Design's own row and card.
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

export type { GroupSort } from "@adapttable/core/features";
