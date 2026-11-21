/**
 * The strings grouping and the grouping panel draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings grouping and the grouping panel draw.
 *
 * @public
 */
export const GROUPING_LABELS: Pick<
  Required<TableLabels>,
  | "moreGroups"
  | "moreRowsInGroup"
  | "expandGroup"
  | "collapseGroup"
  | "groupingDropColumns"
  | "addGroupingColumn"
  | "removeGroupingColumn"
  | "moveGroupingColumn"
  | "groupingDropToRemove"
  | "groupingAggregateColumn"
  | "groupingAggregationDefault"
  | "groupingAggregationNone"
  | "groupingAggregations"
  | "groupingAddAggregation"
  | "groupingRestoreAggregations"
  | "groupingAggregationFor"
  | "groupingAggregationReadOnly"
  | "groupingAggregateRemoved"
  | "groupingAggregatesRestored"
  | "groupingAdded"
  | "groupingRemoved"
  | "groupingMoved"
  | "groupingAggregateChanged"
  | "noticeGroupingUnavailable"
> = {
  moreGroups: (remaining) => `Show ${remaining} more groups`,
  moreRowsInGroup: (remaining) => `Show ${remaining} more in this group`,
  expandGroup: "Expand group",
  collapseGroup: "Collapse group",
  groupingDropColumns: "Drag columns here to group",
  addGroupingColumn: "Add grouping column",
  removeGroupingColumn: (label) => `Remove ${label} from grouping`,
  moveGroupingColumn: (label) => `Move ${label} grouping`,
  groupingDropToRemove: "Drop here to remove grouping",
  groupingAggregateColumn: "Aggregate column",
  groupingAggregationDefault: "Default",
  groupingAggregationNone: "None",
  groupingAggregations: "Aggregations",
  groupingAddAggregation: "Add aggregation column",
  groupingRestoreAggregations: "Restore defaults",
  groupingAggregationFor: (column: string) => `${column} aggregation`,
  groupingAggregationReadOnly: "Set by the app",
  groupingAggregateRemoved: (column: string) => `${column} aggregate removed`,
  groupingAggregatesRestored: "Aggregations restored to defaults",
  groupingAdded: (label) => `${label} added to grouping`,
  groupingRemoved: (label) => `${label} removed from grouping`,
  groupingMoved: (label, position) =>
    `${label} moved to grouping position ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `${label} group aggregation changed to ${aggregation}`,
  noticeGroupingUnavailable: "Grouping is off — this source cannot group.",
};
