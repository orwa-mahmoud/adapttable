/**
 * The core names Angular kits draw with, re-exported so a kit imports only
 * `@adapttable/angular`. A kit never imports `@adapttable/core`: the binding
 * decides how its framework sees each name.
 */
export type { ExportContext } from "./export/exportHandler";
export type {
  ColumnLayoutState,
  ColumnMenuChoice,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
  PinOffset,
  PinSide,
} from "@adapttable/core";
export type {
  ActiveFilterChip,
  FilterDef,
  FilterFormSource,
  FilterOption,
  FilterRuntime,
  FilterTypeRegistry,
  FilterTypeSpec,
  FilterValue,
  RangeOp,
  RelativePreset,
  TextOp,
} from "@adapttable/core";
export type {
  BulkAction,
  ConfirmHandler,
  RowAction,
  RowActionsLayout,
} from "@adapttable/core";
export type {
  ExportCsvOptions,
  TableDensity,
  UrlStateAdapter,
} from "@adapttable/core";
export type { SavedView, SavedViewsControllerOptions } from "@adapttable/core";
export type { ColumnGroupRecord } from "@adapttable/core";
export type { CellNavigationChannelsOptions } from "@adapttable/core";
export {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  nextPinSide,
  pinActionLabel,
  REORDER_COLUMN_KEY,
} from "@adapttable/core";
export {
  bindHeaderFilterDismiss,
  CHECKLIST_LIST_HEIGHT,
  defaultFilterRegistry,
  filterDefForColumn,
  filterLabel,
  filterOpLabel,
  filterWidgetKind,
  hasActiveHeaderFilter,
  headerFilterInsideSelector,
  joinRelativeToken,
  listFilterValues,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  showSimpleFilterFields,
  splitRelativeToken,
  watchOverlayDismiss,
} from "@adapttable/core";
export {
  bulkActionErrorMessage,
  defaultConfirm,
  offersAllMatching,
  resolveDisabledReason,
  runRowAction,
  visibleRowActions,
} from "@adapttable/core";
export { restoreFocusSoon } from "@adapttable/core";
export {
  editorInputType,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  readMultiDraft,
  resolveEditableCellDisplay,
} from "@adapttable/core";
export {
  cellConflictAsk,
  isFirstEditableColumn,
  resolveEditingArming,
  resolveRowEditTrigger,
  rowEditConflict,
} from "@adapttable/core";
export {
  devWarn,
  FILTER_ENGINE_IMPL,
  groupAggregateEntries,
  groupedViewSource,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
  mobileCardListStyle,
  resolveCellEditor,
  windowGroupedEntries,
} from "@adapttable/core";
export { treeCardStyle } from "@adapttable/core";
export {
  orderedCardEntries,
  partitionPinnedRows,
  withRowPinActions,
} from "@adapttable/core";
export { pinnedSummaryPart } from "@adapttable/core";
export {
  asBatchGesture,
  type EditHistoryState,
  withRowMutationActions,
} from "@adapttable/core";
export {
  type AgentApprovalDecision,
  type AgentApprovalOperation,
  type AgentApprovalProposal,
  type ApprovalReview,
  approvalReview,
  type ApprovalReviewItem,
} from "@adapttable/core";
export {
  dirtyMarkerView,
  type RowClickProps,
  rowClickProps,
} from "@adapttable/core";
export type {
  ColumnMenuSlotProps,
  FeatureRender,
  FeatureSlotKey,
  IconDescriptor,
} from "@adapttable/core/binding";
export type {
  FindBarProps,
  FindButtonKind,
  FindButtonProps,
  FindInTableState,
  FindSearchProps,
} from "@adapttable/core/binding";
export type {
  ActiveFilterChipsSlotProps,
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistSearchProps,
  FilterHeaderClassNames,
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderOption,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FilterOverlaySlotProps,
  FiltersFormSlotProps,
  FilterTreeButtonProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
} from "@adapttable/core/binding";
export type {
  BulkBarSlotProps,
  SelectionState,
} from "@adapttable/core/binding";
export type {
  ExportHandlerState,
  FullscreenState,
  ToolbarExtrasSlotProps,
} from "@adapttable/core/binding";
export type { SavedViewsSlotProps } from "@adapttable/core/binding";
export type { GroupingPanelState } from "@adapttable/core/binding";
export type {
  GroupingPanelAggregationRemoveProps,
  GroupingPanelChecklistProps,
  GroupingPanelChipProps,
  GroupingPanelDropZoneProps,
  GroupingPanelRemoveZoneProps,
  GroupingPanelRestoreProps,
  GroupingPanelSelectProps,
  GroupingPanelSlotProps,
} from "@adapttable/core/binding";
export type {
  RowMoveMenuSlotProps,
  RowReorderLabels,
  RowReorderMoveButtonProps,
} from "@adapttable/core/binding";
export type { FeatureNotice } from "@adapttable/core/binding";
export type {
  AgentApprovalButtonProps,
  AgentApprovalProps,
} from "@adapttable/core/binding";
export {
  coreGrouping,
  coreGroupingPanel,
  GROUPING_PANEL,
} from "@adapttable/core/binding";
export {
  COLUMN_MENU,
  columnMenuActions,
  coreColumnMenu,
  eyeIcon,
  filterColumnMenuRows,
  GRIP_ICON,
  hideAllColumns,
  PIN_ICON,
  showAllColumns,
  slotRender,
  unpinAllColumns,
} from "@adapttable/core/binding";
export {
  ACTIVE_FILTER_CHIPS,
  coreFilters,
  coreHeaderFilters,
  FILTER_DRAWER,
  FILTER_HEADER,
  FILTER_POPOVER,
  FILTERS_FORM,
  FILTERS_ICON,
  FilterTriggerToggleState,
  SEARCH_ICON,
} from "@adapttable/core/binding";
export {
  BULK_BAR,
  coreBulkActions,
  coreRowActions,
} from "@adapttable/core/binding";
export {
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU_LIVE,
  coreDensityChooser,
  coreExportCsv,
  coreFindInTable,
  coreFullscreen,
  FIND_BAR,
  SIDE_PANEL,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
export { coreSavedViews, SAVED_VIEWS } from "@adapttable/core/binding";
export {
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
} from "@adapttable/core/binding";
export {
  BATCH_EDIT_BAR,
  chromeColumnPlan,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  ROW_EDIT_ACTIONS,
} from "@adapttable/core/binding";
export {
  bodyWindowKind,
  type ChromeBodySlot,
  chromeRenderModel,
  desktopBodySlots,
  type DesktopRowWiringArgs,
  estimateBodyItemSize,
  EXTRA_ROW_PARTS,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupedFlatEntry,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  groupIndentStyle,
  groupRowParts,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
  resolveBodyVirtualization,
  resolveMobileLabel,
  virtualizeIgnoredOnPage,
} from "@adapttable/core/binding";
export {
  TREE_CELL,
  TREE_TOGGLE,
  type TreeCellProps,
} from "@adapttable/core/binding";
export {
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
} from "@adapttable/core/binding";
export {
  desktopDetailMeasureRef,
  desktopRowMeasureRef,
  expandChevronIcon,
} from "@adapttable/core/binding";
export { pinnedRowSticky } from "@adapttable/core/binding";
export { pinnedRowPart } from "@adapttable/core/binding";
export {
  chromeFeatureNotices,
  type ExportProgressSurfaceSlotProps,
  printToolbarProps,
  STATUS_BAR,
} from "@adapttable/core/binding";
export {
  COLUMN_GROUP_TOGGLE,
  COLUMN_SELECT,
  columnGroupHeaderCaption,
  type ColumnSelectCheckboxChromeProps,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
} from "@adapttable/core/binding";
export {
  type AssemblyFns,
  cellSpanMark,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  extraHostFillStyle,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  type MergedCellStyle,
  mergedCellStyle,
  resolveRowStyle,
} from "@adapttable/core/binding";
export {
  type RowMutationsState,
  undoRedoToolbarProps,
} from "@adapttable/core/binding";
export { renderedRowsOf } from "@adapttable/core/binding";
export { FILL_HANDLE } from "@adapttable/core/binding";
export {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalPending,
  type AgentProgress,
  type AgentViewState,
  type FeatureStateKey,
  featureStateKey,
  type SpeechInputHandle,
  type SpeechInputState,
  type SpeechInputStatus,
  TABLE_ASSISTANT,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";
export {
  assistantIsBusy,
  assistantIsUsable,
  type TableAssistantAllowanceView,
  type TableAssistantMessageView,
  type TableAssistantProgressView,
  type TableAssistantQuestionOption,
  type TableAssistantQuestionView,
  type TableAssistantReceiptSubject,
  type TableAssistantReceiptView,
  type TableAssistantResumableView,
  type TableAssistantSuggestionView,
  type TableAssistantUndoView,
  type TableAssistantView,
} from "@adapttable/core/binding";
