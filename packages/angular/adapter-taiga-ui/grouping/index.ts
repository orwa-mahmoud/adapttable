import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
} from "@adapttable/angular/adapter";
import {
  grouping as coreAngularGrouping,
  type GroupingExtras,
} from "@adapttable/angular/features";
import {
  AdaptGroupHeaderCard,
  AdaptGroupHeaderRow,
} from "@adapttable/taiga-ui";

/**
 * Row grouping — `@adapttable/taiga-ui/grouping`.
 *
 * @packageDocumentation
 */

export type { GroupSort } from "@adapttable/angular";
export type { GroupingExtras } from "@adapttable/angular/features";

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
