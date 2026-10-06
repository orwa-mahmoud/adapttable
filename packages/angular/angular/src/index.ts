/**
 * `@adapttable/angular` — the headless Angular binding. Signals over the
 * framework-neutral stores in `@adapttable/core`: URL-synced view state, the
 * frontend data tier and the headless table, with columns whose renderers
 * are Angular templates or components, and features composed through
 * dependency injection.
 *
 * @packageDocumentation
 */
export { AdaptLiveRegion } from "./a11y/liveRegion";
export { AdaptTableStatusAnnouncer } from "./a11y/tableStatusAnnouncer";
export {
  type BulkActionRunnerOptions,
  type BulkActionRunnerState,
  injectBulkActionRunner,
  injectBulkBarRunner,
  rowActionsFor,
  type RowActionsOptions,
} from "./actions/bulkActionRunner";
export {
  type CommandPaletteInjectOptions,
  injectCommandPalette,
  OPEN_PALETTE_COMMAND,
  type TableCommandPalette,
} from "./actions/commandPalette";
export {
  AdaptCommandPaletteChrome,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "./actions/commandPaletteChrome";
export {
  ADAPTTABLE_CONTEXT_MENU,
  type ContextMenuController,
  type ContextMenuRegionHandlers,
  copyContextMenuSelection,
  injectContextMenu,
  injectTableContextMenu,
  type TableContextMenu,
  type TableContextMenuOptions,
} from "./actions/contextMenu";
export {
  AdaptContextMenuChrome,
  type ContextMenuRow,
  type ContextMenuSlots,
} from "./actions/contextMenuChrome";
export {
  ADAPTTABLE_PALETTE_OPEN,
  type PaletteOpenState,
} from "./actions/paletteState";
export {
  DEFAULT_SHORTCUTS,
  injectShortcuts,
  type UseShortcutsOptions,
} from "./actions/shortcuts";
export {
  aggregate,
  type AggregateOptions,
  type AggregateSpec,
  type SummaryRowFn,
} from "./aggregate/aggregate";
export {
  AdaptAssistantComposer,
  type AssistantComposerProps,
} from "./assistant/assistantComposer";
export { AdaptAssistantContent } from "./assistant/assistantIcons";
export {
  AdaptAssistantAlwaysAllowed,
  AdaptAssistantMessage,
  AdaptAssistantReceipt,
  AdaptAssistantWorking,
  AdaptSpeakerMark,
} from "./assistant/assistantMessages";
export {
  FLOATING_MIN_WIDTH,
  floatingFits,
  floatingStyle,
  injectAssistantFloatingFits,
  launcherStyle,
  type TableAssistantBoundary,
} from "./assistant/assistantPlacement";
export type {
  TableAssistantAvatars,
  TableAssistantBadgeProps,
  TableAssistantButtonProps,
  TableAssistantComposerProps,
  TableAssistantFace,
  TableAssistantLanguageChipProps,
  TableAssistantMenuItem,
  TableAssistantMenuProps,
  TableAssistantNode,
  TableAssistantPanelProps,
  TableAssistantPresentation,
  TableAssistantProps,
  TableAssistantSheetProps,
  TableAssistantSlots,
  TableAssistantWindowProps,
} from "./assistant/assistantSlots";
export {
  type ConversationScroll,
  injectConversationScroll,
} from "./assistant/conversationScroll";
export {
  AdaptTableAssistantChrome,
  type TableAssistantChromeProps,
} from "./assistant/tableAssistantChrome";
export { AdaptAttrs, type Attrs } from "./attrs";
export {
  AdaptCell,
  AdaptCellTemplate,
  AdaptFooter,
  AdaptHeader,
  AdaptHeaderActions,
  type ResolvedRenderer,
  resolveRenderer,
} from "./cell";
export {
  type CellContext,
  type ColumnDef,
  type ColumnGroup,
  type ColumnInput,
  flattenColumns,
  type FooterContext,
  type HeaderContext,
  type Renderer,
  resolveColumns,
} from "./columnDef";
export {
  AdaptColumnGroupToggleChrome,
  type ColumnGroupToggleButtonProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
} from "./columns/columnGroupToggle";
export {
  type ColumnLayout,
  type ColumnLayoutOptions,
} from "./columns/columnLayout";
export {
  type ColumnDrag,
  type ColumnRenameEditorOptions,
  type ColumnRenameEditorState,
  injectColumnDrag,
  injectColumnRenameEditor,
} from "./columns/columnMenu";
export {
  AdaptColumnMenuEdgeRowModel,
  AdaptColumnMenuModel,
  AdaptColumnMenuRowModel,
} from "./columns/columnMenuModels";
export {
  type ColumnResizeHandleProps,
  injectColumnResize,
} from "./columns/columnResize";
export { AdaptControl } from "./control";
export {
  type DataTable,
  type DataTableOptions,
  injectDataTable,
} from "./dataTable";
export {
  AdaptAgentApprovalChrome,
  type AgentApprovalChromeProps,
  type AgentApprovalListProps,
  type AgentApprovalSlots,
} from "./editing/agentApprovalChrome";
export {
  AdaptApprovalReviewChrome,
  type ApprovalReviewChromeProps,
  type ApprovalReviewSlots,
} from "./editing/approvalReviewChrome";
export {
  type DirtyCellsOptions,
  type DirtyCellState,
  type DirtyEdits,
  injectDirtyCells,
} from "./editing/dirtyCells";
export {
  type EditableCellController,
  editableCellController,
  type EditableCellEditing,
  type EditableCellMode,
  type EditingBundle,
  focusEditorOnMount,
  rowEditingSignature,
  rowIsDirty,
  stopCellEditKeyboard,
} from "./editing/editableCellController";
export {
  AdaptCellConflictNotice,
  AdaptEditableCellGate,
  type CellConflictAsk,
  type CellConflictNoticeProps,
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
  editorBusyProps,
  editorValidationProps,
  multiDraftFromSelect,
  stopEditKeys,
} from "./editing/editableCellGate";
export {
  type EditConflict,
  type EditConflictChange,
  type EditConflictChoice,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  injectEditConflict,
  injectLiveEditConflict,
  type LiveEditConflictInput,
  type LiveEditConflictOptions,
  type ReconcileLiveBatchEdit,
  type ReconcileLiveEdit,
  type ReconcileLiveRowEdit,
} from "./editing/editConflict";
export {
  type EditHistoryHandle,
  type EditHistoryOptions,
  injectTableEditHistory,
  type TableEditHistoryProps,
} from "./editing/editHistory";
export {
  type BatchEditHandler,
  type BatchEditingInjectOptions,
  type CellEditHandler,
  type CellEditingOptions,
  injectBatchEditing,
  injectCellEditing,
  injectRowEditing,
  type RowEditHandler,
  type RowEditingInjectOptions,
} from "./editing/editing";
export {
  AdaptMultiSelectEditorChrome,
  type MultiSelectEditorCheckboxProps,
  type MultiSelectEditorSlots,
} from "./editing/multiSelectEditorChrome";
export {
  AdaptBatchEditBarChrome,
  AdaptBatchEditCell,
  AdaptRowEditActionsChrome,
  AdaptRowEditCell,
  type BatchEditBarProps,
  type BatchEditBarSlots,
  type BatchEditButtonProps,
  type RowEditActionsProps,
  type RowEditActionsSlots,
  type RowEditButtonProps,
  type RowEditConflict,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
  type RowEditIcons,
} from "./editing/rowEditGate";
export {
  type CellSaveStateInjectOptions,
  injectCellSaveState,
} from "./editing/saveState";
export {
  type EditValidationInjectOptions,
  injectEditValidation,
} from "./editing/validation";
export { AdaptExportAnnouncer } from "./export/exportAnnouncer";
export {
  AdaptExportProgressChrome,
  type ExportProgressSlots,
} from "./export/exportProgressChrome";
export {
  ADAPTTABLE_FEATURES,
  type AdaptTableFeature,
  extendFeature,
  featureOptionsOf,
  provideAdaptTableFeatures,
  type SlotComponent,
} from "./featureHost";
export { tableFeaturesOf } from "./featureHost";
export {
  createFeatureResources,
  type FeatureMountContext,
  type FeatureResources,
  mountTableFeatures,
} from "./featureLifecycle";
export { createAdapterAgentApprovalFeature } from "./features/agentApproval";
export {
  cellNavigation,
  type CellNavigationOptions,
} from "./features/cellNavigation";
export { editHistory } from "./features/editHistory";
export {
  batchEditing,
  dirtyIndicators,
  editing,
  type EditingLifecycleExtras,
  rowEditing,
} from "./features/editing";
export {
  bulkActions,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  type CommandPaletteOptions,
  contextMenu,
  type ContextMenuOptions,
  extraRows,
  feature,
  fitColumns,
  headerFilters,
  multiSort,
  pinnedSummaryRows,
  print,
  resizableColumns,
  rowAppearance,
  type RowAppearanceOptions,
  savedViews,
  sidePanel,
  type SidePanelOptions,
  type SidePanelPanel,
  statusBar,
  undoRedoButtons,
} from "./features/factories";
export { filterTypes } from "./features/filters";
export { findInTable } from "./features/findInTable";
export {
  grouping,
  type GroupingExtras,
  type GroupingOptions,
  type GroupSort,
  injectGrouping,
  type TableGrouping,
} from "./features/grouping";
export {
  groupingPanel,
  type GroupingPanelExtras,
} from "./features/groupingPanel";
export {
  injectRowDetail,
  nestedTable,
  rowDetail,
  type RowDetailOptions,
  type TableRowDetail,
} from "./features/rowDetail";
export {
  injectTableRowPinning,
  rowPinning,
  type RowPinningFeatureOptions,
  type TableRowPinningOptions,
} from "./features/rowPinning";
export { rowReorder } from "./features/rowReorder";
export {
  type SelectionStats,
  selectionStats,
  selectionStatsOf,
  type SelectionStatsOptions,
} from "./features/selectionStats";
export { createAdapterTableAssistantFeature } from "./features/tableAssistant";
export {
  injectTree,
  type TableTree,
  tree,
  type TreeFeatureOptions,
  type TreeOptions,
} from "./features/tree";
export { virtualize, type VirtualizeOptions } from "./features/virtualize";
export {
  ADAPTTABLE_FEATURE_STATE,
  createFeatureState,
  type FeatureState,
  injectFeatureState,
} from "./featureState";
export { activeFilterChipsFor } from "./filters/activeFilterChips";
export {
  AdaptChecklistChrome,
  type ChecklistSlots,
} from "./filters/checklistChrome";
export {
  checklistSlice,
  nextChecklistViewport,
} from "./filters/checklistWindow";
export {
  AdaptAutoFilterFormModel,
  AdaptBooleanFilterFieldModel,
  AdaptFilterOptionsModel,
  AdaptMultiSelectFilterFieldModel,
  AdaptRangeFilterFieldModel,
  AdaptSelectFilterFieldModel,
  AdaptTextFilterFieldModel,
  createFilterFieldId,
} from "./filters/filterFieldModels";
export {
  AdaptFilterHeaderChrome,
  AdaptFilterHeaderControlChrome,
  type FilterHeaderSlots,
} from "./filters/filterHeaderRow";
export {
  booleanFilterFor,
  filterChipsFor,
  filterOptionsFor,
  type FilterOptionsState,
  filterRuntimeFor,
  type FilterRuntimeOptions,
  rangeFilterFor,
  type TableFilters,
  textFilterFor,
} from "./filters/filters";
export { filterTreeChips } from "./filters/filterTreeChips";
export {
  AdaptFilterTreeChrome,
  type AngularFilterTreeDisclosureProps,
  type FilterTreeSlots,
} from "./filters/filterTreeChrome";
export { injectHeaderFilterOverlay } from "./filters/headerFilterOverlay";
export {
  type FiltersMode,
  type FiltersView,
  filtersViewFor,
  type FiltersViewInput,
} from "./filters/tableFilters";
export { AdaptFindBarChrome, type FindBarSlots } from "./find/findBar";
export { type FindInTableOptions, injectFindInTable } from "./find/findInTable";
export {
  findMarkAttrs,
  injectFindFocus,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
} from "./find/findMarks";
export { ADAPTTABLE_FIND_STATE } from "./find/findState";
export {
  AdaptColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
  type ColumnSelectSlots,
} from "./focus/columnSelectCheckbox";
export {
  AdaptFillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleFocus,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "./focus/fillHandle";
export {
  type GridFocus,
  type GridFocusOptions,
  injectGridFocus,
} from "./focus/gridFocus";
export {
  AdaptGridFocusAnnouncer,
  type GridFocusAnnouncement,
} from "./focus/gridFocusAnnouncer";
export {
  AdaptSelectionStatsChrome,
  type SelectionStatsSlots,
} from "./focus/selectionStatsBar";
export {
  AdaptStatusBarChrome,
  type StatusBarSlots,
} from "./focus/statusBarChrome";
export {
  type GroupCollapseOptions,
  type GroupCollapseState,
  injectGroupCollapse,
} from "./grouping/groupCollapse";
export {
  AdaptGroupHeaderCardModel,
  AdaptGroupHeaderRowModel,
} from "./grouping/groupHeaderModels";
export {
  AdaptGroupingPanelChrome,
  type AngularGroupingPanelAggregationItemProps,
  type AngularGroupingPanelSurfaceProps,
  type GroupingPanelSlots,
} from "./grouping/groupingPanelChrome";
export {
  type GroupingPanelStateOptions,
  injectGroupingPanelState,
} from "./grouping/groupingPanelState";
export {
  AdaptGroupMoreButtonChrome,
  type GroupMoreButtonProps,
  type GroupMoreButtonSlotProps,
  type GroupMoreButtonSlots,
} from "./grouping/groupMoreButton";
export {
  type GroupPagingOptions,
  type GroupPagingState,
  injectGroupPaging,
} from "./grouping/groupPaging";
export { AdaptGroupToggleSpacer } from "./grouping/groupToggleSpacer";
export { injectIsMobile, type IsMobileOptions } from "./hooks/isMobile";
export { injectMediaQuery } from "./hooks/mediaQuery";
export { injectPrefersReducedMotion } from "./hooks/prefersReducedMotion";
export { AdaptIcon } from "./icon";
export * from "./kitExports";
export { type DataTableClassNames } from "./layout/dataTableClassNames";
export {
  AdaptDataTableShell,
  type BodyCellView,
  type BodyRow,
  type BodySlot,
  type DataTableSurface,
  type RowActionsCell,
  type TableView,
} from "./layout/dataTableShell";
export { AdaptDesktopTableModel } from "./layout/desktopTableModel";
export { AdaptMobileCardsModel } from "./layout/mobileCardsModel";
export { injectPopoverSpace } from "./layout/popoverSpace";
export {
  AdaptSidePanelChrome,
  AdaptSidePanelLayout,
  type SidePanelSlots,
} from "./layout/sidePanelChrome";
export {
  type RuntimeGrouping,
  type RuntimeTableOptions,
  tableRuntimeFor,
} from "./layout/tableRuntime";
export {
  type DensityOptions,
  type DensityState,
  type ExportCsvHandlerOptions,
  exportPdf,
  exportXlsx,
  injectDensity,
  injectExportCsv,
  injectExportHandler,
  injectFullscreen,
} from "./layout/toolbar";
export {
  type ChangedCellFlash,
  type ChangedCellFlashOptions,
  injectChangedCellFlash,
} from "./rows/changedCellFlash";
export { AdaptExtraRowContent } from "./rows/extraRowContent";
export { type Highlight, injectHighlight } from "./rows/highlight";
export type {
  MobileCardContext,
  MobileCardField,
  MobileCardRenderer,
} from "./rows/mobileCard";
export type { RowActionsContext, RowActionsRenderer } from "./rows/rowActions";
export {
  injectRowExpansion,
  type RowExpansionOptions,
  type RowExpansionState,
} from "./rows/rowExpansion";
export {
  injectRowMutations,
  type RowMutationHandlers,
  type RowMutationsOptions,
} from "./rows/rowMutations";
export {
  injectRowPinning,
  type RowPinLabels,
  type RowPinningOptions,
  type RowPinningState,
  type RowPinSide,
} from "./rows/rowPinning";
export {
  injectRowReorder,
  type RowReorderState,
  type RowReorderStateOptions,
} from "./rows/rowReorder";
export {
  AdaptRowReorderAnnouncer,
  AdaptRowReorderButtonsChrome,
  AdaptRowReorderHandleChrome,
  type RowReorderButtonsProps,
  type RowReorderButtonsSlots,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
  type RowReorderHandleSlots,
} from "./rows/rowReorderHandle";
export {
  injectRowSelection,
  type RowSelection,
  type RowSelectionOptions,
} from "./selection/selection";
export {
  AdaptSlot,
  ADAPTTABLE_SLOT_TABLE,
  type SlotFills,
  type SlotTable,
} from "./slots";
export {
  type FrontendDataOptions,
  injectFrontendData,
} from "./source/frontendData";
export {
  type InfiniteQuerySignals,
  injectQuerySource,
  type QuerySourceOptions,
} from "./source/querySource";
export {
  injectServerData,
  type ServerDataOptions,
  type TableQueryHandler,
} from "./source/serverData";
export {
  injectTableData,
  type TableDataOptions,
  type TableDataResult,
} from "./source/tableData";
export {
  type ExternalStore,
  fromStore,
  type FromStoreOptions,
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "./store";
export {
  injectLazyChildren,
  type LazyChildrenInjectOptions,
  type LazyChildrenState,
} from "./tree/lazyChildren";
export {
  AdaptRowDetail,
  type NestedTable,
  type NestedTableContext,
  type NestedTableDefaults,
  type NestedTableFor,
  type NestedTableParent,
  type RowDetailContext,
} from "./tree/nestedTable";
export { AdaptTreeCellChrome } from "./tree/treeCell";
export {
  injectTreeExpansion,
  type TreeExpansionOptions,
  type TreeExpansionState,
} from "./tree/treeExpansion";
export {
  AdaptTreeToggleChrome,
  type TreeToggleButtonProps,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "./tree/treeToggle";
export {
  type ColumnLayoutUrlState,
  type ColumnLayoutUrlStateOptions,
  injectColumnLayoutUrlState,
} from "./url/columnLayoutUrlState";
export {
  type DensityUrlState,
  type DensityUrlStateOptions,
  injectDensityUrlState,
} from "./url/densityUrlState";
export {
  type GroupCollapseUrlState,
  type GroupCollapseUrlStateOptions,
  injectGroupCollapseUrlState,
} from "./url/groupCollapseUrlState";
export {
  injectRowPinningUrlState,
  type RowPinningUrlState,
} from "./url/rowPinningUrlState";
export {
  injectSavedViews,
  type SavedViewsOptions,
  type SavedViewsState,
} from "./url/savedViews";
export {
  AdaptSavedViewGlyph,
  AdaptSavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "./url/savedViewsPanelChrome";
export {
  ADAPTTABLE_URL_ADAPTER,
  injectTableUrlState,
  type TableUrlState,
  type TableUrlStateOptions,
  urlAdapterFor,
} from "./url/tableUrlState";
export {
  injectUrlSlice,
  type UrlSlice,
  type UrlSliceOptions,
} from "./url/urlSlice";
export { AdaptColumnSpacer } from "./virtual/columnSpacer";
export {
  type ColumnWindow,
  type ColumnWindowOptions,
  injectColumnWindow,
} from "./virtual/columnWindow";
export {
  injectRowPairMeasurer,
  type ResizableVirtualizer,
  type RowPairMeasurer,
  type RowPairMeasurerOptions,
} from "./virtual/measureRowPair";
export {
  injectKeyedVirtualization,
  injectKeyedVirtualizer,
  injectTableVirtualization,
  injectTableVirtualizer,
  type KeyedVirtualizationOptions,
  type TableVirtualizationOptions,
} from "./virtual/tableVirtualization";
export {
  injectMeasuredWindowScrollMargin,
  type MeasuredWindowScrollMarginOptions,
} from "./virtual/windowScrollMargin";
export type {
  EditEvent,
  EditEventHandler,
  EditLifecycle,
  EditUnit,
} from "@adapttable/core";
export type {
  BatchEditingState,
  BatchRowEdit,
  CellEditingState,
  RowEditingState,
} from "@adapttable/core";
export type { RowReorderHandler, RowReorderOptions } from "@adapttable/core";
export type {
  CellRange,
  CellSpanAppearance,
  Command,
  ContextMenuItem,
  ContextMenuTarget,
  Direction,
  ExtraFilters,
  ExtraRow,
  FacetMap,
  GetCellSpan,
  GridCell,
  KeyedVirtualization,
  PaginatedResponse,
  PaginationInfo,
  PaginationMode,
  PaginationSlot,
  PinnedRows,
  QueryAggregate,
  QuerySupport,
  RowHeight,
  RowStyle,
  Shortcut,
  SortDirection,
  TableLabels,
  TableQuery,
  TableQueryParams,
  TableSource,
  TableVirtualization,
  TreeEntry,
  VirtualTableRow,
} from "@adapttable/core";
export type {
  FeaturePatch,
  RowPinState,
  SidePanelEntry,
} from "@adapttable/core/binding";
export type {
  ChromeBodyRegion,
  HeaderSelectionState,
} from "@adapttable/core/binding";
