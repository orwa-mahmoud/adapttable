/**
 * Public names for the row features' controllers and policies — grouping,
 * trees, row actions and cell navigation — that a framework binding drives.
 * Kept as a dedicated barrel so the main entry stays grouped by concern.
 */

export {
  type GroupingContribution,
  mergeGroupingContributions,
  projectGroupingContribution,
  REMAINING_FEATURE_OWNERSHIP,
  type RemainingFeatureDomain,
} from "./features/featureContribution";
export type { TableRuntime, TableRuntimeView } from "./features/tableRuntime";
export type { CellNavigationChannelsOptions } from "./focus/cellNavigationRuntime";
export {
  cellNavigationChannels,
  cellRangeKey,
  reportedCellRange,
} from "./focus/cellNavigationRuntime";
export type {
  ContextMenuCopyFocus,
  ContextMenuCopyTarget,
} from "./focus/contextMenuCopy";
export {
  contextMenuCopyTarget,
  copyContextMenuSelection,
  copyContextMenuTargetCell,
  withContextMenuCellCopy,
} from "./focus/contextMenuCopy";
export type { GroupCollapseActions } from "./grouping/groupCollapse";
export { groupCollapseActions } from "./grouping/groupCollapse";
export type {
  GroupingDropHandlers,
  GroupingDropPlan,
} from "./grouping/groupingPanelChromeModel";
export {
  aggregationRemovalFocusSelectors,
  deferGroupingDropToInner,
  focusAfterAggregationRemoval,
  groupingAggregationOptions,
  groupingAvailableColumns,
  groupingColumnName,
  groupingDropPlan,
  groupingOperationLabel,
  INERT_GROUPING_DROP_HANDLERS,
} from "./grouping/groupingPanelChromeModel";
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
  groupingCollapseCommands,
  groupingProjectionBundle,
  groupingShowMoreAction,
  groupingSourceOf,
  projectedGroupingSource,
  projectGrouping,
} from "./grouping/groupingProjection";
export type {
  GroupedRowModel,
  GroupedRowModelOptions,
  GroupingAggregates,
  GroupingAggregatesOptions,
  GroupingRuntimeSource,
  GroupShowMoreRequest,
} from "./grouping/groupingRuntime";
export {
  groupedRowModel,
  groupedViewSource,
  groupingAggregates,
  groupingAggregationSource,
  groupingIgnoredWarning,
  groupingPanelAggregations,
  groupShowMoreRequest,
} from "./grouping/groupingRuntime";
export type { GroupPagingController } from "./grouping/groupPaging";
export {
  advanceGroupPaging,
  createGroupPagingController,
} from "./grouping/groupPaging";
export type { MergedRowActions, RowPinLabels } from "./rows/rowActionsRuntime";
export {
  commitRowPin,
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  ROW_PIN_STORE_OPTIONS,
  rowMutationActions,
  rowPinActions,
  rowPinningBlockedWarning,
  rowPinningControl,
  rowPinningRequested,
  rowPinningUrlSync,
  UNPIN_ROW_ACTION_KEY,
  withRowMutationActions,
  withRowPinActions,
} from "./rows/rowActionsRuntime";
export {
  dispatchRowMove,
  rowMoveView,
  rowReorderRuntimeOptions,
} from "./rows/rowReorderRuntime";
export type {
  LazyChildrenController,
  LazyChildrenOptions,
  LazyChildrenSnapshot,
} from "./tree/lazyChildren";
export { createLazyChildrenController } from "./tree/lazyChildren";
export type { TreeExpansionActions } from "./tree/treeRuntime";
export {
  closeFailedTreeNode,
  toggleTreeNode,
  treeExpansionActions,
  treeExportExpandedIds,
} from "./tree/treeRuntime";
