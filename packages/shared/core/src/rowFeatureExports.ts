/**
 * Public names for the row features' controllers and policies — grouping,
 * trees, row actions and cell navigation — that a framework binding drives.
 * Kept as a dedicated barrel so the main entry stays grouped by concern.
 */

export type {
  ColumnLayoutContribution,
  PinningContribution,
} from "./columns/columnLayoutModel";
export {
  type EditingContribution,
  type GroupingContribution,
} from "./features/featureContribution";
export type { TableRuntime, TableRuntimeView } from "./features/tableRuntime";
export type { CellNavigationChannelsOptions } from "./focus/cellNavigationRuntime";
export type {
  ContextMenuCopyFocus,
  ContextMenuCopyTarget,
} from "./focus/contextMenuCopy";
export { contextMenuCopyTarget } from "./focus/contextMenuCopy";
export type { GroupCollapseActions } from "./grouping/groupCollapse";
export type {
  GroupingDragEventLike,
  GroupingKeyEventLike,
  GroupingPanelController,
  GroupingPanelControllerOptions,
  GroupingPanelSnapshot,
} from "./grouping/groupingPanelController";
export { createGroupingPanelController } from "./grouping/groupingPanelController";
export type {
  GroupingProjection,
  GroupingProjectionInput,
  GroupingShowMoreTarget,
} from "./grouping/groupingProjection";
export {
  groupingProjectionBundle,
  groupingSourceOf,
  projectGrouping,
} from "./grouping/groupingProjection";
export type {
  GroupedRowModel,
  GroupingAggregates,
  GroupingRuntimeSource,
} from "./grouping/groupingRuntime";
export {
  groupingIgnoredWarning,
  groupingPanelAggregations,
} from "./grouping/groupingRuntime";
export type { RowPinLabels } from "./rows/rowActionsRuntime";
export {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  rowPinningControl,
  UNPIN_ROW_ACTION_KEY,
} from "./rows/rowActionsRuntime";
export { rowReorderRuntimeOptions } from "./rows/rowReorderRuntime";
export type { LazyChildrenOptions } from "./tree/lazyChildren";
export type { TreeContribution } from "./tree/treeBindingState";
export {
  closeFailedTreeNode,
  toggleTreeNode,
  treeExportExpandedIds,
} from "./tree/treeRuntime";
