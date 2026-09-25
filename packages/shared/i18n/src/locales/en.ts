import { defaultLabels, type TableLabels } from "@adapttable/core";

/**
 * English (`en`) label preset.
 *
 * @public
 */
export const en: Required<TableLabels> = {
  ...defaultLabels,
  exportDismiss: "Dismiss",
  rowMoveOptions: "Row move options",
  moveToGroup: "Move to group…",
  moveUnder: "Move under…",
  moveToTopLevel: "Move to top level",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row, from, to) =>
    `Move ${row} from ${from} to ${to}?`,
  confirmRowMove: "Move",
  rowMovedToGroup: (group) => `Row moved to ${group}`,
  rowMovedUnder: (parent) => `Row moved under ${parent}`,
  moveRejectedPolicyNever: "Cross-boundary row moves are disabled",
  moveRejectedSorted: "Clear sorting before changing row order",
  moveRejectedCycle: "A row cannot move inside itself or its descendant",
  moveUnavailable: "This row move is not available",
  rootLevel: "Top level",
  groupingPanel: "Row grouping",
  groupingDropColumns: "Drag columns here to group",
  addGroupingColumn: "Add grouping column",
  groupByColumn: (label) => `Group by ${label}`,
  ungroupColumn: (label) => `Ungroup ${label}`,
  removeGroupingColumn: (label) => `Remove ${label} from grouping`,
  moveGroupingColumn: (label) => `Move ${label} grouping`,
  groupingDropToRemove: "Drop here to remove grouping",
  groupingAggregateColumn: "Aggregate column",
  groupingAggregation: "Group aggregation",
  groupingAggregationDefault: "Default",
  groupingAggregationNone: "None",
  groupingAggregations: "Aggregations",
  groupingAddAggregation: "Add aggregation column",
  groupingRestoreAggregations: "Restore defaults",
  groupingRemoveAggregation: (column) => `Remove ${column} aggregation`,
  groupingAggregationFor: (column) => `${column} aggregation`,
  groupingAggregationReadOnly: "Set by the app",
  groupingAggregationCustom: "Custom",
  groupingAggregateRemoved: (column) => `${column} aggregate removed`,
  groupingAggregatesRestored: "Aggregations restored to defaults",
  groupingAverage: "Average",
  groupingAdded: (label) => `${label} added to grouping`,
  groupingRemoved: (label) => `${label} removed from grouping`,
  groupingMoved: (label, position) =>
    `${label} moved to grouping position ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `${label} group aggregation changed to ${aggregation}`,
  pinnedSummaryRow: "Summary row",
  pinnedSummaryTop: "Pinned summary rows at the top",
  pinnedSummaryBottom: "Pinned summary rows at the bottom",
};
