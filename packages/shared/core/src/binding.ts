/**
 * The adapter machinery, framework-neutral — `@adapttable/core/binding`.
 *
 * Column-group, extra-row, pinned-row, row-span, row-style and column-menu
 * math that every kit's rendering shares. `@adapttable/react/adapter` re-exports
 * all of it beside the React-bound helpers, and is where an adapter imports
 * it from; this entry is the React-free half that binding is built on.
 *
 * @packageDocumentation
 */
export type {
  CommandPaletteChromeProps,
  CommandPaletteInputProps,
  CommandPaletteItemProps,
  CommandPaletteSlots,
  CommandPaletteSurfaceProps,
} from "./actions/commandPaletteContract";
export type {
  ContextMenuChromeProps,
  ContextMenuItemProps,
  ContextMenuSlots,
  ContextMenuSurfaceProps,
} from "./actions/contextMenuContract";
export {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalButtonProps,
  type AgentApprovalListProps,
  type AgentApprovalProps,
  type AgentApprovalSlots,
  type AgentViewState,
  type ApprovalReviewSlots,
} from "./approval/agentApprovalContract";
export {
  assistantActionsName,
  assistantBadgeTone,
  assistantComposerState,
  assistantInitials,
  assistantLauncherName,
  assistantProgressText,
  assistantQuestion,
  assistantReceiptDetail,
  assistantReceiptHeadline,
  assistantReceiptNeedsSave,
  assistantReceiptWhere,
  assistantRejoinable,
  assistantShownReceipts,
  assistantUndoReason,
  assistantUndoTurnLabel,
  assistantVoicePlaceholder,
  assistantWithGreeting,
  assistantWorkingText,
  type TableAssistantBadgeTone,
  type TableAssistantComposerState,
} from "./assistant/assistantModel";
export {
  ASSISTANT_FLOATING_MIN_WIDTH,
  assistantFloatingFits,
  assistantFloatingStyle,
  assistantLauncherStyle,
  type TableAssistantPlacement,
} from "./assistant/assistantPlacement";
export type {
  TableAssistantAvatars,
  TableAssistantBadgeProps,
  TableAssistantBoundary,
  TableAssistantButtonProps,
  TableAssistantComposerProps,
  TableAssistantFace,
  TableAssistantLanguageChipProps,
  TableAssistantMenuItem,
  TableAssistantMenuProps,
  TableAssistantPanelProps,
  TableAssistantPresentation,
  TableAssistantProps,
  TableAssistantSheetProps,
  TableAssistantSlots,
  TableAssistantWindowProps,
} from "./assistant/assistantSlots";
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
} from "./assistant/assistantView";
export type {
  SpeechInputHandle,
  SpeechInputState,
  SpeechInputStatus,
} from "./assistant/speechView";
export type {
  ColumnGroupToggleButtonProps,
  ColumnGroupToggleProps,
  ColumnGroupToggleSlots,
} from "./columns/columnGroupToggleContract";
export {
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export {
  applyCollapsedColumnGroups,
  flattenColumnTree,
} from "./columns/columnTree";
export {
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  headerGroupRow,
  headerGroupRows,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  toggleCollapsedColumnGroup,
} from "./columns/headerGroups";
export type { BatchEditEntry, BatchEditingState } from "./editing/batchEditing";
export type {
  EditableCellActivateProps,
  EditableCellButtonProps,
  EditableCellSlots,
} from "./editing/editableCellContract";
export type {
  RowEditConflict,
  RowEditControlsOptions,
} from "./editing/editingGate";
export type {
  MultiSelectEditorCheckboxProps,
  MultiSelectEditorSlots,
} from "./editing/multiSelectEditorContract";
export type {
  BatchEditBarProps,
  BatchEditBarSlots,
  BatchEditButtonProps,
  RowEditActionsProps,
  RowEditActionsSlots,
  RowEditButtonProps,
  RowEditIcons,
} from "./editing/rowEditContract";
export type { RowEditDrafts, RowEditingState } from "./editing/rowEditing";
export type {
  ExportProgressAction,
  ExportProgressChromeProps,
  ExportProgressDownload,
  ExportProgressSlots,
  ExportProgressSurfaceSlotProps,
} from "./export/exportProgressContract";
export {
  drawnSlotFills,
  type FeatureRender,
  type FeatureSlotKey,
  featureSlotKey,
  type FeatureStateKey,
  featureStateKey,
  type OrderedContribution,
  orderedContributions,
  type SlotFill,
  slotFillsOf,
  slotRender,
} from "./features/featureKeys";
export {
  createFeatureHost,
  disposeFeatureHost,
  EMPTY_FEATURE_HOST,
  type FeatureSetup,
  LiveFeatureHost,
} from "./features/liveFeatureHost";
export { deriveRuntimeOperations } from "./features/runtimeOperations";
export {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  BATCH_EDIT_BAR,
  BULK_BAR,
  type BulkBarSlotProps,
  CELL_NAV_LIVE,
  type CellNavLiveSlotProps,
  CHROME_BODY,
  type ChromeBodySlotProps,
  type ChromeExtraSlotProps,
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_LAYOUT_LIVE,
  COLUMN_MENU,
  COLUMN_SELECT,
  type ColumnHeaderRenameSlotProps,
  COMMAND_PALETTE,
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU,
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  EDIT_HISTORY_LIVE,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  type EditHistoryLiveSlotProps,
  EDITING_LIVE,
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  EXPANSION_LIVE,
  EXPORT_LIVE,
  type ExportLiveSlotProps,
  FILL_HANDLE,
  type FillHandleCellSlotProps,
  FILTER_CHIPS_LIVE,
  FILTER_DRAWER,
  FILTER_HEADER,
  FILTER_POPOVER,
  type FilterOverlaySlotProps,
  FILTERS_FORM,
  FIND_BAR,
  FIND_LIVE,
  type FindLiveSlotProps,
  FULLSCREEN_LIVE,
  type FullscreenLiveSlotProps,
  GRID_FOCUS_ANNOUNCER,
  type GridFocusAnnouncerSlotProps,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  GROUPING_LIVE,
  GROUPING_PANEL,
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  SELECTION_LIVE,
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveSlotProps,
  SIDE_PANEL,
  STATUS_BAR,
  TABLE_ASSISTANT,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
  TREE_CELL,
  TREE_LIVE,
  TREE_TOGGLE,
} from "./features/slotContract";
export type { TableRuntime, TableRuntimeView } from "./features/tableRuntime";
export type {
  ActiveFilterChip,
  ActiveFilterChipsSlotProps,
} from "./filters/activeFilterChips";
export type {
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistClassNames,
  ChecklistFilterProps,
  ChecklistSearchProps,
  ChecklistSlots,
} from "./filters/checklistContract";
export { FILTER_ENGINE } from "./filters/filterEngineKey";
export type {
  FilterHeaderClassNames,
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderOption,
  FilterHeaderRangeProps,
  FilterHeaderRowProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FilterHeaderSlots,
} from "./filters/filterHeaderContract";
export type {
  FilterTreeBuilderProps,
  FilterTreeButtonProps,
  FilterTreeClassNames,
  FilterTreeDisclosureProps,
  FilterTreeInputProps,
  FilterTreeOption,
  FilterTreeSelectProps,
  FilterTreeSlots,
} from "./filters/filterTreeContract";
export type {
  FindBarProps,
  FindBarSlots,
  FindButtonKind,
  FindButtonProps,
  FindInTableState,
  FindSearchProps,
} from "./find/findBarContract";
export type {
  ColumnSelectCheckboxChromeProps,
  ColumnSelectCheckboxProps,
  ColumnSelectSlots,
} from "./focus/columnSelectContract";
export type {
  FillHandleSlotProps,
  FillHandleSlots,
} from "./focus/fillHandleContract";
export type {
  SelectionStatPart,
  SelectionStatsChromeProps,
  SelectionStatsSlotProps,
  SelectionStatsSlots,
} from "./focus/selectionStatsContract";
export type {
  StatusBarChromeProps,
  StatusBarItem,
  StatusBarSlotProps,
  StatusBarSlots,
} from "./focus/statusBarContract";
export type {
  GroupingPanelAggregationItemProps,
  GroupingPanelAggregationRemoveProps,
  GroupingPanelChecklistOption,
  GroupingPanelChecklistProps,
  GroupingPanelChipProps,
  GroupingPanelDropZoneProps,
  GroupingPanelOption,
  GroupingPanelRemoveZoneProps,
  GroupingPanelRestoreProps,
  GroupingPanelSelectProps,
  GroupingPanelSlotProps,
  GroupingPanelSlots,
  GroupingPanelSurfaceProps,
} from "./grouping/groupingPanelContract";
export { GROUPING_PANEL_STATE } from "./grouping/groupingPanelKey";
export type {
  GroupMoreButtonProps,
  GroupMoreButtonSlotProps,
  GroupMoreButtonSlots,
} from "./grouping/groupMoreContract";
export {
  cellAttributes,
  type ChromeBodySlot,
  type ChromeCellSizing,
  type ChromeColumnPlan,
  chromeColumnPlan,
  type ChromeExtraSlot,
  type ChromeGroupEntry,
  type ChromeGroupSlot,
  type ChromeRowSlot,
  type ChromeSortState,
  type ChromeVirtualPadSlot,
  columnAriaSort,
  columnTextAlign,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_RESIZE_HANDLE_STYLE,
  DESKTOP_SELECTION_WIDTH,
  type DesktopBodyPinStyle,
  desktopBodyPinStyle,
  desktopChromeMetrics,
  type DesktopChromeWidths,
  desktopDetailMeasureRef,
  desktopEdgeHeadPin,
  desktopHasPinned,
  type DesktopHeadCellGeometry,
  desktopHeadCellGeometry,
  desktopPinSignature,
  desktopRowMeasureRef,
  type DesktopScrollBoxStyle,
  desktopScrollBoxStyle,
  documentOffsetTop,
  entryKeys,
  extraRowCoveredSlots,
  headerCellAttributes,
  headerRowAttributes,
  measureRowDetailAsPair,
  measureWindowScrollMargin,
  pinnedRowIds,
  rowAttributes,
  type RowPairMeasurer,
  searchInputAttributes,
  sortButtonAttributes,
  sortIndexOf,
  sortLevelOf,
  sourceWindowStart,
  tableAttributes,
  virtualListElement,
} from "./layout/chromeModel";
export {
  type AssemblyFns,
  bodyCellsHaveRowSpan,
  cellsForRow,
  extraHostFillStyle,
  isExtraEntry,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
  resolveRowStyle,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "./layout/leanAssembly";
export type {
  SidePanelChromeProps,
  SidePanelCloseProps,
  SidePanelFrameProps,
  SidePanelSlots,
  SidePanelTabProps,
} from "./layout/sidePanelContract";
export type {
  PivotAddProps,
  PivotAggProps,
  PivotFieldProps,
  PivotPanelChromeProps,
  PivotPanelSlots,
  PivotPanelSurfaceProps,
  PivotZoneProps,
} from "./pivot/pivotPanelContract";
export { type BodyCell, cellSpanMark } from "./rows/cellSpan";
export {
  type CellSpanRequest,
  type GetCellSpan,
  type GetCellSpanArgs,
} from "./rows/cellSpan";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "./rows/extraRows";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowStickyStyle,
} from "./rows/pinnedRowChrome";
export { resolveRowHeight } from "./rows/rowPresentation";
export type {
  RowMoveConfirmationProps,
  RowMoveMenuItemProps,
  RowMoveMenuSlotProps,
  RowReorderButtonsProps,
  RowReorderButtonsSlots,
  RowReorderHandleProps,
  RowReorderHandleSlotProps,
  RowReorderHandleSlots,
  RowReorderMoveButtonProps,
} from "./rows/rowReorderContract";
export type {
  TreeCellProps,
  TreeToggleButtonProps,
  TreeToggleProps,
  TreeToggleSlots,
} from "./tree/treeToggleContract";
export type {
  SavedViewControlKey,
  SavedViewRowControl,
  SavedViewsPanelChromeProps,
  SavedViewsPanelEmptyProps,
  SavedViewsPanelInputProps,
  SavedViewsPanelRowProps,
  SavedViewsPanelSlots,
  SavedViewsPanelSurfaceProps,
} from "./url/savedViewsPanelContract";
export { rowSourceIndex } from "./virtual/virtualTableModel";

/**
 * The member types the signatures above hand back, so a consumer of this
 * entry can name every part of what it returns.
 */
export {
  ensureForcedColorsStyles,
  FORCED_COLORS_CSS,
} from "./a11y/forcedColors";
export type { Command } from "./actions/commandRegistry";
export type { ConfirmHandler } from "./actions/confirm";
export type { ConfirmRequest } from "./actions/confirm";
export type {
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export type { ContextMenuPoint } from "./actions/contextMenuOpenController";
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  CustomAggregateOperation,
  ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOptions,
  AggregateOrderedValue,
  AggregateSpec,
  Aggregator,
  DeclaredAggregates,
} from "./aggregate/aggregate";
export type {
  AggregationCandidate,
  AggregationItem,
  AggregationModel,
  AggregationOrigin,
} from "./aggregate/aggregationModel";
export type { AgentApprovalPending, AgentProgress } from "./approval/types";
export type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalProposal,
} from "./approval/types";
export type {
  ColumnAiOptions,
  ColumnGroupShow,
  ColumnModel,
  ColumnModelEditor,
  ColumnModelFilter,
  ExtraFilters,
  FilterValue,
  SortableValue,
  SortDirection,
} from "./columnModel";
export type {
  ColumnLayoutState,
  PinLeads,
  PinnedCellStyle,
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuChromeProps,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
  ColumnMenuSlotProps,
  PinnedSide,
} from "./columns/columnMenuModel";
export type { ColumnResizeHandleProps } from "./columns/columnResize";
export type {
  ColumnGroupDef,
  ColumnGroupRecord,
  ColumnInput,
  FlattenedColumns,
} from "./columns/columnTree";
export type { GroupedHeaderAlign } from "./columns/headerGroups";
export type { DisplayValue } from "./display";
export type {
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type {
  TableEngine,
  TableEngineConfigPatch,
  TableEngineReader,
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
  TableSnapshot,
} from "./engine/createTableEngine";
export type { NeutralTable } from "./engine/neutralTable";
export type {
  ExportProgressState,
  ExportStatus,
} from "./export/exportController";
export type {
  ExportPayload,
  ExportRowMeta,
  ExportRowRole,
  ExportTable,
  ExportWriteContext,
  ExportWriter,
} from "./export/exportWriter";
export type { ExportContext, ExportCsvOptions } from "./export/tableCsv";
export type {
  ExportAllControls,
  ExportAllQuery,
  ExportAllResult,
  ExportColumnScope,
  ExportInfo,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "./export/tableCsv";
export type { ExportQuery } from "./export/tableCsv";
export {
  coreBatchEditing,
  coreBulkActions,
  coreCellNavigation,
  coreCellSpan,
  coreCollapsibleColumnGroups,
  coreColumnMenu,
  coreColumnSelectionCheckbox,
  coreCommandPalette,
  coreContextMenu,
  coreDensityChooser,
  coreDirtyIndicators,
  coreEditHistory,
  coreEditing,
  coreExportCsv,
  coreExtraRows,
  type CoreFeature,
  coreFeature,
  type CoreFeatureRegistrar,
  coreFilters,
  coreFilterTypes,
  coreFindInTable,
  coreFitColumns,
  coreFullscreen,
  coreGrouping,
  coreGroupingPanel,
  coreHeaderFilters,
  coreMultiSort,
  coreNestedTable,
  corePinnedSummaryRows,
  corePrint,
  coreResizableColumns,
  coreRowActions,
  coreRowAppearance,
  coreRowDetail,
  coreRowEditing,
  type CoreRowFeatureRegistrar,
  coreRowPinning,
  coreSavedViews,
  coreSelectionStats,
  coreSidePanel,
  coreStatusBar,
  coreTree,
  coreUndoRedoButtons,
  coreVirtualize,
  type VirtualizeInput,
} from "./features/coreFeatures";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FeatureHostState,
  FilterTypeExtend,
  SidePanelEntry,
} from "./features/currentHost";
export {
  applyTableFeatures,
  type FeatureApplyInput,
  type FeaturePatch,
  getAppliedFeatures,
  mergeFeaturePatches,
  type PatchFeature,
  rememberAppliedFeatures,
} from "./features/featurePatch";
export type { FeatureRegistration } from "./features/featureRegistration";
export {
  type CoreStandardFeatureFactories,
  type CoreStandardFeatureOptions,
  standardFeatureList,
} from "./features/standardPreset";
export type { ChecklistValue } from "./filters/checklistValues";
export type { FacetCounts, FacetMap } from "./filters/facets";
export type { FilterRuntime } from "./filters/filterDefs";
export {
  type ChipLabelResolver,
  FILTER_TYPES,
  type FilterAiOptions,
  type FilterDef,
  type FilterOption,
  type FilterOptionsSource,
  type FilterType,
} from "./filters/filterDefs";
export type { FilterEngine } from "./filters/filterEngine";
export type {
  FilterFormSource,
  FiltersFormSlotProps,
} from "./filters/filterFormModel";
export type {
  FilterTypeRegistry,
  FilterTypeSpec,
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type { CellRange } from "./focus/cellRange";
export type { GridCell } from "./focus/gridFocus";
export type { SelectionStats } from "./focus/selectionStats";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "./grouping/groupAggregateOverrides";
export type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDragSource,
  GroupingDragState,
  GroupingDropProps,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "./grouping/groupingPanelModel";
export type { GroupAggregateOps } from "./grouping/groupRowLayout";
export type {
  GroupAggregatesFn,
  GroupedFlatEntry,
  GroupNode,
  GroupPaging,
  GroupSort,
  RowGroupLevel,
  RowGroupRef,
} from "./grouping/groupRows";
export {
  absoluteColumnIndex,
  columnHeaderControllerFor,
  DESKTOP_ROW_WIRING_KEYS,
  desktopBodySlots,
  type DesktopBodySlotsInput,
  desktopEdgeBodyStyle,
  desktopEdgeHeadStyle,
  desktopHeadCellStyle,
  desktopHeaderLeaf,
  type DesktopHeaderLeafContext,
  desktopPinEdges,
  desktopRowDomProps,
  type DesktopRowPinPart,
  desktopRowWiring,
  type DesktopRowWiringArgs,
  type DesktopRowWiringContext,
  desktopRowWiringEqual,
  type DesktopRowWiringModel,
  type DesktopStickyPlan,
  desktopStickyPlan,
  desktopTableStyle,
  headerSortDir,
  type LeafColumn,
  type LeafSortProps,
  type WiringReorder,
} from "./layout/desktopAssembly";
export {
  cellNavigationInput,
  CHROME_EXTRA_SLOT_ORDER,
  exportPageOnly,
  finishShellBody,
  finishShellLive,
  liveColumnLayout,
  livePinning,
  type OverlayChrome,
  overlayChromeExtras,
  type PipelineShell,
  printToolbarProps,
  readableRowLabel,
  renderedRowsOf,
  type RuntimeChromeInput,
  type RuntimeColumn,
  SHELL_LIVE_STAGE_ORDER,
  type ShellBodyInput,
  type ShellLiveStageId,
  TableRuntimePublisher,
  tableRuntimeView,
  undoRedoToolbarProps,
  viewControlsToolbarProps,
} from "./layout/shellPipeline";
export {
  applyFeatureNoticesAttribute,
  cardSetSize,
  type ChromeBodyRegion,
  chromeBodyRegion,
  chromeEmptyVariant,
  chromeFeatureNotices,
  type ChromeFeatureNoticesInput,
  chromeIsRefreshing,
  chromeShowFooter,
  clearChromeFilters,
  featureNoticesAttribute,
  FilterTriggerToggleState,
  groupingPanelState,
  rowReorderEnablement,
  scrollResetKeys,
  selectionObserverIds,
  sortedColumnName,
} from "./layout/tableChromeState";
export type { PivotField, PivotZone } from "./pivot/pivotConfigModel";
export type { PivotConfig } from "./pivot/pivotModel";
export type { PivotMeasure } from "./pivot/pivotModel";
export type { CellSpanAppearance } from "./rows/cellSpan";
export type { ExtraEntry, ExtraRow, ExtraRowKind } from "./rows/extraRows";
export type { IncrementalViewConfig } from "./rows/incremental";
export type { RowPinLookup, RowPinSide } from "./rows/rowPinModel";
export type { RowPinState } from "./rows/rowPinModel";
export type { RowReorderLabels } from "./rows/rowReorderEngine";
export { ROW_DND_MIME } from "./rows/rowReorderEngine";
export type { RowReorderDigest } from "./rows/rowReorderModel";
export type { RowHeight, RowStyle } from "./rows/rowStyle";
export type { SortLevel } from "./sort/compare";
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./source/capabilities";
export type {
  AggregateFn,
  QueryAggregate,
  QueryCondition,
  QueryFilterGroup,
} from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableSource } from "./source/TableSource";
export type { FeatureNotice, FeatureNoticeKind } from "./state/featureNotices";
export type { FeatureNoticeAppearance } from "./state/featureNotices";
export type { CollectFeatureNoticesInput } from "./state/featureNotices";
export {
  cellHighlightKind,
  cellHighlightStyle,
  CURRENT_MATCH_CELL_STYLE,
  groupIndentStyle,
  type GroupRowKind,
  groupRowParts,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  logicalAlign,
  MATCHED_CELL_STYLE,
  type MergedCellStyle,
  mergedCellStyle,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  resolveMobileLabel,
  SELECTED_CELL_OUTLINE,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  sortArrow,
} from "./style/cellDisplay";
export type { CssProperties } from "./style/cssProperties";
export {
  ASSISTANT_ACTIONS_ICON,
  ASSISTANT_AVATAR_ICON,
  ASSISTANT_CLOSE_ICON,
  ASSISTANT_EXAMPLES_ICON,
  ASSISTANT_KIND_HUES,
  ASSISTANT_KIND_PATHS,
  ASSISTANT_SEND_ICON,
  ASSISTANT_SETTINGS_ICON,
  ASSISTANT_STOP_ICON,
  ASSISTANT_UNDO_ICON,
  assistantKindIcon,
  assistantMicIcon,
  assistantReceiptIcon,
  expandChevronIcon,
  eyeIcon,
  FILTERS_ICON,
  GRIP_ICON,
  type IconDescriptor,
  type IconShape,
  PERSON_AVATAR_ICON,
  PIN_ICON,
  SEARCH_ICON,
} from "./style/icons";
export { MOUNT_STAGGER, OVERLAY_MOTION } from "./style/motion";
export type { TableStateMutators } from "./tableStateMutators";
export type { TreeEntry } from "./tree/treeRows";
export type {
  ActionAiOptions,
  ActionApprovalPolicy,
  ActionConfirm,
  ApprovalPresentation,
  BulkAction,
  BulkActionContext,
  ColumnHeaderController,
  ColumnMetadata,
  Direction,
  ResolvedPaginationMode,
  RowAction,
  TableLabels,
} from "./types";
export type { SavedView } from "./url/savedViewsController";
export type { SavedViewVisibility } from "./url/savedViewsController";
export {
  asSizeEstimator,
  bodyCanLoadMore,
  type BodyChrome,
  bodySentinelCount,
  type BodyWindowKind,
  bodyWindowKind,
  type ChromeRenderModel,
  chromeRenderModel,
  type ChromeRenderModelInput,
  type ColumnViewport,
  type ColumnWindowPlan,
  columnWindowPlan,
  EndReachedLatch,
  estimateBodyItemSize,
  fetchNextBodyPage,
  hasLoadedChildren,
  isBodyEligible,
  keyedWindow,
  materializeWindowRows,
  pendingListSize,
  pinnedScrollRows,
  readColumnViewport,
  resolveBodyVirtualization,
  RowPairMeasureController,
  rowScrollTarget,
  rowWindow,
  SummaryCellsCache,
  virtualizeIgnoredOnPage,
  type WindowVirtualizer,
  withSourceIndices,
} from "./virtual/bodyWindow";
export type {
  KeyedVirtualization,
  TableVirtualization,
  VirtualItemMeta,
  VirtualTableRow,
} from "./virtual/virtualTableModel";

// Building blocks every binding shares: column defaults and the data-change
// test its table engine runs on each render.
export {
  columnPathText,
  type ResolvableColumn,
  resolveColumnDefaults,
  resolveColumnHeaders,
} from "./columns/resolveColumns";
export { sameRows } from "./engine/sameRows";

// Shared state shapes the bindings return from their hooks.
export type { BulkBarState } from "./actions/actionsBindingState";
export type { UseColumnLayoutStorageStateResult } from "./columns/columnsBindingState";
export type { ExportHandlerState } from "./export/exportBindingState";
export type {
  ChecklistFilterState,
  ChecklistWindowState,
} from "./filters/filtersBindingState";
export type { GridFocusState } from "./focus/focusBindingState";
export type {
  GroupCollapseState,
  GroupPagingState,
} from "./grouping/groupingBindingState";
export {
  DENSITY_STATE,
  type DensityFeatureState,
  type ResolvedDensity,
} from "./layout/densityContract";
export type { FullscreenState } from "./layout/layoutBindingState";
export type { UsePivotUrlStateResult } from "./pivot/pivotBindingState";
export { ROW_REORDER, type RowReorderState } from "./rows/rowReorderContract";
export type {
  ChangedCellFlashState,
  HighlightState,
  RowExpansionState,
  RowMutationsState,
  RowPinningState,
} from "./rows/rowsBindingState";
export type { SelectionState } from "./selection/selectionBindingState";
export type { HeaderSelectionState } from "./selection/selectionState";
export type {
  SearchInputState,
  UseTableDataResult,
} from "./source/sourceBindingState";
export type { RowPatchStreamState } from "./stream/streamBindingState";
export type {
  LazyChildrenState,
  TreeExpansionState,
} from "./tree/treeBindingState";
export type {
  UseColumnLayoutUrlStateResult,
  UseDensityUrlStateResult,
  UseGroupCollapseUrlStateResult,
  UseRowPinningUrlStateResult,
  UseSavedViewsResult,
  UseTableUrlStateResult,
} from "./url/urlBindingState";
// Types the shared state shapes above hand back.
export type { EditableColumnLike } from "./editing/cellEditing";
export type { RowValidator } from "./editing/editContracts";
export type {
  EditCommitSnapshot,
  EditCommitValidationFailure,
  EditCommitValidationOptions,
} from "./editing/editCommitLifecycle";
export type { ChecklistWindow } from "./filters/checklistModel";
export type { HighlightedCell } from "./rows/highlightStore";
export type { RowPatchEvent } from "./rows/patch";
export type {
  RowDropPosition,
  RowMoveMenuModel,
  RowMoveRequest,
  RowMoveTarget,
  RowTreeParentRef,
} from "./rows/rowMove";
export type { RowPatchStreamStatus } from "./stream/status";
export type { TableDensity } from "./url/viewStateSlices";
