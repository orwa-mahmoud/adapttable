import { type AdaptTableFeature } from "@adapttable/angular";
import { type GroupNode, type GroupSort } from "@adapttable/core";
import { coreGrouping } from "@adapttable/core/binding";

/**
 * Everything grouping can be told.
 *
 * @public
 */
export interface GroupingExtras<TRow = unknown> {
  /** Told when the keys change, so a host can mirror them. */
  readonly onGroupByChange?: (groupBy: readonly string[]) => void;
  /** Draw a footer row under each group. */
  readonly groupFooters?: boolean;
  /** Show this many groups at a time. */
  readonly groupPageSize?: number;
  /** Show this many rows inside each group. */
  readonly groupRowPageSize?: number;
  /** Keep only the groups this accepts — each with its value, label and rows. */
  readonly groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Order the groups themselves. */
  readonly groupSort?: GroupSort<TRow>;
  /** Per-group subtotals, the same mapper shape as a summary row. */
  readonly groupAggregates?: (rows: readonly TRow[]) => unknown;
  /** Controlled collapse state. */
  readonly collapsedGroupIds?: readonly string[];
  /** Told when a group opens or closes. */
  readonly onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Fetch the rest of a group on demand. */
  readonly onGroupLoadMore?: (groupKey: string) => void;
}

/**
 * Group rows under collapsible headers.
 *
 * ```ts
 * import { grouping } from "@adapttable/angular-unstyled/grouping";
 *
 * features: [grouping("team", { groupAggregates: (rows) => ({ points: sum(rows) }) })]
 * ```
 *
 * @param groupBy - The grouping keys, outermost first.
 * @param extras - See {@link GroupingExtras}.
 * @returns The feature.
 *
 * @public
 */
export function grouping<TRow = unknown>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): AdaptTableFeature {
  return coreGrouping<TRow>(groupBy, extras) as AdaptTableFeature;
}
