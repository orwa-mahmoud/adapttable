/**
 * Row grouping — `@adapttable/angular-aria/grouping`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  grouping as coreAngularGrouping,
  type GroupingExtras,
  slotRender,
} from "@adapttable/angular";
import {
  AdaptGroupHeaderCard,
  AdaptGroupHeaderRow,
} from "@adapttable/angular-aria";

export type { GroupingExtras, GroupSort } from "@adapttable/angular";

/**
 * Group rows under collapsible headers drawn with native controls, as rows
 * on desktop and as cards on phones.
 *
 * ```ts
 * features: [grouping("team", { groupAggregates: (rows) => ({ points: sum(rows) }) })]
 * ```
 *
 * @param groupBy - The grouping keys, outermost first.
 * @param extras - Aggregates, footers, paging, sorting and collapse state.
 * @returns The feature.
 *
 * @public
 */
export function grouping<TRow = unknown>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): AdaptTableFeature {
  return extendFeature(coreAngularGrouping(groupBy, extras), [
    slotRender(GROUP_HEADER_ROW, () => AdaptGroupHeaderRow),
    slotRender(GROUP_HEADER_CARD, () => AdaptGroupHeaderCard),
  ]);
}
