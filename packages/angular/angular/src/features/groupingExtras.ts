/**
 * Options a grouping feature carries. Kept out of the feature module so the
 * grouping controller can read them without loading the feature factory.
 */
import type { GroupNode, GroupSort } from "@adapttable/core";

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
