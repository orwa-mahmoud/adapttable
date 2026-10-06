/** Application signals, rendering declarations and feature contracts. @packageDocumentation */
export {
  type BulkActionRunnerOptions,
  type BulkActionRunnerState,
  injectBulkActionRunner,
} from "./actions/bulkActionRunner";
export {
  type ContextMenuController,
  injectContextMenu,
} from "./actions/contextMenu";
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
  type TableAssistantAvatars,
  type TableAssistantFace,
  type TableAssistantNode,
  type TableAssistantProps,
} from "./assistant/assistantContracts";
export { type Attrs } from "./attrContracts";
export { AdaptCellTemplate } from "./cellTemplate";
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
export { type ColumnDrag, injectColumnDrag } from "./columns/columnDrag";
export {
  type ColumnLayout,
  type ColumnLayoutOptions,
} from "./columns/columnLayout";
export {
  type DataTable,
  type DataTableOptions,
  injectDataTable,
} from "./dataTable";
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
} from "./editing/editableCellController";
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
  type CellSaveStateInjectOptions,
  injectCellSaveState,
} from "./editing/saveState";
export {
  type EditValidationInjectOptions,
  injectEditValidation,
} from "./editing/validation";
export {
  type ExportContext,
  type ExportCsvHandlerOptions,
  injectExportCsv,
  injectExportHandler,
} from "./export/exportHandler";
export {
  ADAPTTABLE_FEATURES,
  type AdaptTableFeature,
  extendFeature,
  featureOptionsOf,
  provideAdaptTableFeatures,
  type SlotComponent,
  tableFeaturesOf,
} from "./featureHost";
export {
  createFeatureResources,
  type FeatureMountContext,
  type FeatureResources,
  mountTableFeatures,
} from "./featureLifecycle";
export {
  ADAPTTABLE_FEATURE_STATE,
  createFeatureState,
  type FeatureState,
  injectFeatureState,
} from "./featureState";
export { activeFilterChipsFor } from "./filters/activeFilterChips";
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
export { injectHeaderFilterOverlay } from "./filters/headerFilterOverlay";
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
  type GridFocus,
  type GridFocusOptions,
  injectGridFocus,
} from "./focus/gridFocus";
export {
  type GroupCollapseOptions,
  type GroupCollapseState,
  injectGroupCollapse,
} from "./grouping/groupCollapse";
export {
  type GroupPagingOptions,
  type GroupPagingState,
  injectGroupPaging,
} from "./grouping/groupPaging";
export { injectIsMobile, type IsMobileOptions } from "./hooks/isMobile";
export { injectMediaQuery } from "./hooks/mediaQuery";
export { injectPrefersReducedMotion } from "./hooks/prefersReducedMotion";
export { type DataTableClassNames } from "./layout/dataTableClassNames";
export {
  type DensityOptions,
  type DensityState,
  injectDensity,
  injectFullscreen,
} from "./layout/toolbar";
export {
  type ChangedCellFlash,
  type ChangedCellFlashOptions,
  injectChangedCellFlash,
} from "./rows/changedCellFlash";
export { type Highlight, injectHighlight } from "./rows/highlight";
export {
  type MobileCardContext,
  type MobileCardField,
  type MobileCardRenderer,
} from "./rows/mobileCard";
export {
  type RowActionsContext,
  type RowActionsRenderer,
} from "./rows/rowActions";
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
  injectRowSelection,
  type RowSelection,
  type RowSelectionOptions,
} from "./selection/selection";
export {
  ADAPTTABLE_SLOT_TABLE,
  type SlotFills,
  type SlotTable,
} from "./slotContracts";
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
  type NestedTable,
  type NestedTableContext,
  type NestedTableFor,
  type RowDetailContext,
} from "./tree/nestedTableContracts";
export {
  injectTreeExpansion,
  type TreeExpansionOptions,
  type TreeExpansionState,
} from "./tree/treeExpansion";
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
  type ActiveFilterChip,
  type AgentApprovalDecision,
  type AgentApprovalOperation,
  type AgentApprovalProposal,
  type ApprovalReview,
  type ApprovalReviewItem,
  type BatchEditingState,
  type BatchRowEdit,
  type BulkAction,
  type CellEditingState,
  type CellNavigationChannelsOptions,
  type CellRange,
  type CellSpanAppearance,
  type ColumnGroupRecord,
  type ColumnLayoutState,
  type Command,
  type ConfirmHandler,
  type ContextMenuItem,
  type ContextMenuRegionHandlers,
  type ContextMenuTarget,
  type Direction,
  type EditEvent,
  type EditEventHandler,
  type EditHistoryState,
  type EditLifecycle,
  type EditUnit,
  type ExportCsvOptions,
  type ExtraFilters,
  type ExtraRow,
  type FacetMap,
  type FilterDef,
  type FilterFormSource,
  type FilterOption,
  type FilterRuntime,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  type FilterValue,
  type GetCellSpan,
  type GridCell,
  type GroupSort,
  type KeyedVirtualization,
  type NestedTableDefaults,
  type NestedTableParent,
  type PaginatedResponse,
  type PaginationInfo,
  type PaginationMode,
  type PaginationSlot,
  type PinnedRows,
  type PinOffset,
  type PinSide,
  type QueryAggregate,
  type QuerySupport,
  type RangeOp,
  type RelativePreset,
  type RowAction,
  type RowActionsLayout,
  type RowEditingState,
  type RowHeight,
  type RowReorderHandler,
  type RowReorderOptions,
  type RowStyle,
  type SavedView,
  type SavedViewsControllerOptions,
  type SelectionStats,
  type Shortcut,
  type SortDirection,
  type TableDensity,
  type TableLabels,
  type TableQuery,
  type TableQueryParams,
  type TableSource,
  type TableVirtualization,
  type TextOp,
  type TreeEntry,
  type UrlStateAdapter,
  type VirtualTableRow,
} from "@adapttable/core";
export {
  type ChromeBodyRegion,
  type ExportHandlerState,
  type FeaturePatch,
  type FeatureRender,
  type FeatureSlotKey,
  type FeatureStateKey,
  featureStateKey,
  type FindInTableState,
  type FullscreenState,
  type HeaderSelectionState,
  type RowEditIcons,
  type RowMutationsState,
  type RowPinState,
  type SelectionState,
  type SidePanelEntry,
  slotRender,
  type TableAssistantBoundary,
  type TableAssistantPresentation,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";
