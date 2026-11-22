/**
 * `@adapttable/core` — the headless engine behind AdaptTable.
 *
 * Zero UI-kit, i18n-library, or router imports. Exposes the unified
 * {@link TableSource} contract, the framework-neutral engine, URL-synced
 * state, filter chips, and selection. React hooks live on `@adapttable/react`.
 *
 * @packageDocumentation
 */

/* ── Types ─────────────────────────────────────────────────────────── */
export { createBasicTableEngine } from "./engine/basicTableEngine";
export { cellValue } from "./engine/cellValue";
export {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableCallbackRefresh,
  type TableEngine,
  type TableEngineConfigPatch,
  type TableEngineReader,
  type TableOperation,
  type TableRevisionAxis,
  type TableRevisions,
  type TableRowScope,
  type TableSnapshot,
} from "./engine/createTableEngine";
export {
  createNeutralTable,
  type NeutralTable,
  type NeutralTableBinding,
  revisionToken,
} from "./engine/neutralTable";
// Presentation contracts for an agent write awaiting a human. Type-only: an
// adapter names them without any AI runtime reaching its graph.
export type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalPending,
  AgentApprovalProposal,
  AgentProgress,
} from "./approval/types";
export type {
  ActionAiOptions,
  ActionApprovalPolicy,
  ActionConfirm,
  ApprovalPresentation,
  BulkAction,
  BulkActionContext,
  CellProps,
  ColorScheme,
  ColumnAiOptions,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  ColumnHeaderController,
  ColumnMetadata,
  ColumnModel,
  Direction,
  ExtraFilters,
  FilterValue,
  PaginatedResponse,
  PaginationMode,
  ResolvedPaginationMode,
  RowAction,
  RowCallback,
  SortableValue,
  SortByOption,
  SortDirection,
  TableLabels,
  TableQueryParams,
} from "./types";
/* ── Actions (confirm + runners) ───────────────────────────────────── */
export {
  type ConfirmHandler,
  type ConfirmRequest,
  runRowAction,
} from "./actions/confirm";
/* ── Shared prop surface + orchestration ───────────────────────────── */
/* ── Declarative filters & data tiers ──────────────────────────────── */
export type { Command } from "./actions/commandRegistry";
export { filterCommands, tableCommands } from "./actions/commandRegistry";
export type {
  ContextMenuActions,
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export {
  type ContextMenuKeyEvent,
  type ContextMenuMoveEvent,
  type ContextMenuPoint,
  type ContextMenuPointerEvent,
  type ContextMenuPressEvent,
  type ContextMenuRegionHandlers,
  type ContextMenuState,
  type ContextMenuTriggerHandlers,
} from "./actions/contextMenuOpenController";
export {
  type Aggregatable,
  type AggregatableConfig,
  type AggregateOperation,
  type AggregationSourceSupport,
  type CustomAggregateOperation,
  impliedOperations,
  resolveAggregatable,
  resolveAggregatableColumns,
  type ResolvedAggregatable,
  type ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export {
  aggregate,
  type AggregateFormatContext,
  type AggregateName,
  type AggregateOperationId,
  type AggregateOptions,
  type AggregateOrderedValue,
  type AggregateSpec,
  type Aggregator,
  type DeclaredAggregates,
  declaredAggregates,
  type GroupAggregatesMapper,
} from "./aggregate/aggregate";
export {
  AGGREGATE_SUPPRESSED,
  type AggregationCandidate,
  type AggregationItem,
  type AggregationModel,
  aggregationModel,
  type AggregationModelInput,
  type AggregationOrigin,
  type EffectiveAggregation,
  type EffectiveAggregationInput,
  type EffectiveAggregationKind,
  resolveEffectiveAggregation,
  restoreAggregationDefaults,
  serializeAggregationDerivedKey,
} from "./aggregate/aggregationModel";
export { computedAggregateKeys } from "./aggregate/computedAggregateKeys";
export {
  type ApprovalArgumentPair,
  approvalArgumentPairs,
  type ApprovalReview,
  approvalReview,
  type ApprovalReviewItem,
  approvalValueText,
} from "./approval/approvalReview";
export { columnText } from "./columns/columnText";
export { computed, type ComputedColumnSpec } from "./columns/computed";
export {
  type BatchEditEntry,
  type BatchEditHandler,
  type BatchEditingState,
  type BatchEditSnapshot,
  type BatchEditStore,
  type BatchEditStoreOptions,
  type BatchPendingDrafts,
} from "./editing/batchEditing";
export {
  type DirtyCellState,
  type DirtyCellStoreOptions,
} from "./editing/dirtyCells";
export {
  type CellEditingState,
  type CellSaveState,
  type EditableCellController,
  type EditableCellMode,
  type EditActivation,
  type EditConflictLabels,
  type EditingBundle,
  type EditValidationState,
} from "./editing/editableCell";
export {
  type ContestedEditCell,
  type EditConflictSnapshot,
  type EditConflictState,
  type ReconcileLiveBatchEdit,
  type ReconcileLiveEdit,
  type ReconcileLiveRowEdit,
} from "./editing/editConflictView";
export type {
  BatchRowEdit,
  CellValidator,
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
  EditEvent,
  EditEventHandler,
  EditLifecycle,
  EditUnit,
  RowValidator,
  ValidationTarget,
} from "./editing/editContracts";
export {
  type CellEditHandler,
  type EditHistoryController,
  type EditHistoryControllerOptions,
  type EditHistoryState,
} from "./editing/editHistory";
export {
  type CellEditKeyAction,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  type CellEditSession,
  type CellEditSessionOptions,
  type CellEditSnapshot,
  type CellSaveStatus,
  type CellSaveStoreOptions,
  type EditHistoryEntry,
  type EditHistorySnapshot,
  type EditValidationStoreOptions,
  type FailedCellSave,
  type ValidationCheckResult,
} from "./editing/editingController";
export {
  type CellConflictAsk,
  type EditableCellEditorCtrl,
  type EditorAriaState,
  type EditorDraftControl,
  type RowEditConflict,
  type RowEditControls,
  type RowEditControlsOptions,
  type RowEditTrigger,
} from "./editing/editingGate";
export {
  type RowEditDrafts,
  type RowEditHandler,
  type RowEditingState,
  type RowEditSnapshot,
  type RowEditStore,
  type RowEditStoreOptions,
} from "./editing/rowEditing";
export type { NeutralFeatureHost } from "./features/featureRegistration";
export type { ActiveFilterChip } from "./filters/activeFilterChips";
export {
  computeFilterFacets,
  type FacetCounts,
  type FacetMap,
  rowsExcludingFilter,
} from "./filters/facets";
export {
  builtInFilterSpecs,
  defaultFilterRegistry,
  resolveFilterRegistry,
} from "./filters/filterBuiltins";
export {
  type FilterChromeMode,
  resolveFilterMode,
  toolbarShowsFilters,
} from "./filters/filterChrome";
export {
  AUTO_OPTIONS_LIMIT,
  buildFilterRuntime,
  type ColumnFilter,
  FILTER_AI_OPTIONS_LIMIT,
  FILTER_TYPES,
  type FilterAiOptions,
  type FilterDef,
  filterLabel,
  type FilterOption,
  type FilterOptionsSource,
  type FilterRuntime,
  filterStateKeys,
  type FilterType,
  RANGE_SUFFIXES,
  resolveFilterDefs,
} from "./filters/filterDefs";
export {
  createFilterRegistry,
  emptyFilterRegistry,
  filterTypeDefaultOp,
  filterTypeOps,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  filterTypeSpec,
  type FilterWidgetKind,
  filterWidgetKind,
  type FilterWidgetRenderProps,
  renderRegisteredFilter,
} from "./filters/filterRegistry";
export {
  conditionToExtra,
  evaluateFilterTree,
  FILTER_TREE_PARAM,
  FILTER_TREE_VERSION,
  isActiveFilterTree,
  parseFilterTree,
  serializeFilterTree,
} from "./filters/filterTree";
export {
  bindHeaderFilterDismiss,
  HEADER_FILTER_SESSION_ATTR,
  headerFilterFieldIsComplete,
  type HeaderFilterOpenHost,
  type HeaderFilterWrites,
  type OverlayDismissOptions,
} from "./filters/headerFilterOverlay";
export {
  DATE_OP_LABEL_KEYS,
  DATE_OPS,
  FILTER_OP_SUFFIX,
  type FilterOp,
  filterOpKey,
  formatFilterChip,
  isBetweenFilterOp,
  isEmptyRowValue,
  isFilterOpKey,
  isListFilterOp,
  isValuelessFilterOp,
  NUMBER_OP_LABEL_KEYS,
  NUMBER_OPS,
  parseDateOp,
  parseListOperand,
  parseNumberList,
  parseNumberOp,
  parseTextOp,
  readFilterOp,
  TEXT_OP_LABEL_KEYS,
  TEXT_OPS,
} from "./filters/operators";
export {
  RANGE_OP_LABEL_KEYS,
  RANGE_OPS,
  type RangeOp,
  type RangeWidgetState,
  writeRangeFilter,
} from "./filters/rangeWidget";
export {
  countedRelativeToken,
  isRelativeDateToken,
  joinRelativeToken,
  parseRelativeToken,
  RELATIVE_NAMED,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  type RelativeDateRange,
  type RelativeDateToken,
  type RelativePreset,
  relativeTokenLabel,
  resolveRelativeRange,
  splitRelativeToken,
} from "./filters/relativeDates";
export {
  type ServerFilterKeys,
  serverFilterKeys,
  type ServerFilterKeysInput,
} from "./filters/serverFilterKeys";
export { FIND_URL_WRITE_DEBOUNCE_MS } from "./find/findController";
export {
  findMatches,
  type FindMatchesOptions,
  matchKeySet,
  stepMatch,
} from "./find/findMatches";
export { type CellEdit } from "./focus/cellEdits";
export {
  type CellRange,
  type CellRangeBounds,
  cellRangeBounds,
  cellRangeIndices,
  cellRangeSize,
  extendCellRange,
  isInCellRange,
  isSingleCell,
  singleCellRange,
} from "./focus/cellRange";
export {
  type ClipboardRangeOptions,
  clipboardRangeText,
  readClipboardText,
  writeClipboardText,
} from "./focus/clipboardRange";
export {
  type FillDirection,
  fillDirection,
  fillRangeEdits,
  type FillRangeOptions,
  fillTargetRange,
} from "./focus/fillRange";
export {
  type GridBounds,
  type GridCell,
  type GridFocusMove,
  gridFocusMoveForKey,
  type GridKeyPress,
  moveGridFocus,
  sameGridCell,
} from "./focus/gridFocus";
export {
  GRID_CELL_ATTR,
  gridCellAttr,
  type GridFocusControllerOptions,
} from "./focus/gridFocusController";
export {
  type CellFillHandlerOptions,
  type CellPasteHandlerOptions,
  parseClipboardTable,
  pasteRangeEdits,
  type PasteRangeOptions,
} from "./focus/pasteRange";
export {
  type SelectionStats,
  selectionStats,
  type SelectionStatsOptions,
} from "./focus/selectionStats";
export type {
  MobileCardField,
  MobileCardModel,
  MobileCardRenderer,
} from "./rows/mobileCard";
export {
  type AggregateFn,
  isFilterGroup,
  type QueryAggregate,
  type QueryCondition,
  type QueryContribution,
  type QueryExtensions,
  type QueryFilterGroup,
  type QuerySupport,
} from "./source/queryContract";
export {
  tableQueryBaseKey,
  tableQueryKey,
  type TableQueryKeyOptions,
} from "./source/queryKey";
export type { Slot, TableErrorState } from "./state/errorState";
export type {
  SliceCell,
  SliceKey,
  SliceRead,
  StoreReader,
  StoreWriter,
  TableAction,
  TableStore,
} from "./state/tableStore";
export {
  applyRowPin,
  type LayoutStorage,
  offersAllMatching,
} from "./state/tableStores";
export { humanizeKey } from "./utils/humanizeKey";
export { splitListParam } from "./utils/listParam";
export { getPath } from "./utils/path";
/* ── Labels ────────────────────────────────────────────────────────── */
export { resolveLabels } from "./labels";
/* ── Constants ─────────────────────────────────────────────────────── */
export { DEFAULT_LIMIT, PAGE_SIZE_OPTIONS, pageSizeOptions } from "./constants";
export type { DisplayValue } from "./display";
export {
  type ChecklistValue,
  collectChecklistValues,
} from "./filters/checklistValues";
export type { ChipLabelResolver } from "./filters/filterDefs";
export {
  type FilterFormSource,
  type FilteringContribution,
  listFilterValues,
} from "./filters/filterFormModel";
export type { CssProperties } from "./style/cssProperties";
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
} from "./url/historyAdapter";
export {
  routerUrlAdapter,
  type RouterUrlAdapterOptions,
} from "./url/routerAdapter";
export {
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewMigration,
  type SavedViewsControllerOptions,
  type SavedViewsStore,
  type SavedViewVisibility,
} from "./url/savedViewsController";
export type { UrlStateAdapter } from "./url/urlStateAdapter";
export {
  type TableDensity,
  URL_SLICE_WRITE_DEBOUNCE_MS,
} from "./url/viewStateSlices";
export {
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlSliceSpec,
  type ViewStateSubscription,
} from "./url/viewStateStore";
/* ── Shared render contracts ───────────────────────────────────────── */

/* ── Sources ───────────────────────────────────────────────────────── */
export type {
  CapabilitySource,
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./source/capabilities";
export { capabilityReason, sourceCapabilities } from "./source/capabilities";
export {
  type InfiniteQueryLike,
  type PageSelector,
  type TableQueryListener,
} from "./source/dataTier";
export {
  defaultFrontendRowId,
  defaultSearchText,
  type FrontendEngineFactory,
} from "./source/frontendSource";
export type { TableSource } from "./source/TableSource";
export type {
  SummaryRowFn,
  TableOptions,
  TableToolbarSlots,
} from "./tableOptions";
export type { TableStateMutators } from "./tableStateMutators";
/* ── Filters / chips ───────────────────────────────────────────────── */
export {
  clearCountFilterExtra,
  COUNT_OPERATOR_SYMBOL,
  COUNT_OPERATORS,
  countFilterChipLabel,
  countFilterExtra,
  type CountFilterState,
  countFilterStateFromExtra,
  type CountOperator,
  isCountFilterComplete,
  sanitizeCountFilterParams,
} from "./filters/countFilters";
/* ── Sorting ───────────────────────────────────────────────────────── */
export { type SortLevel } from "./sort/compare";
/* ── Columns ───────────────────────────────────────────────────────── */
export { autoSizeColumns, measureColumnWidth } from "./columns/autoSizeColumns";
export {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuLabel,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
export {
  type ColumnResizeHandleOptions,
  type ColumnResizeHandleProps,
  type ResizeHandleEventLike,
  type ResizeKeyEventLike,
  type ResizePointerEventLike,
} from "./columns/columnResize";
export {
  type ColumnGroupDef,
  type ColumnGroupRecord,
  type ColumnInput,
  isColumnGroup,
  marriedOrderHolds,
} from "./columns/columnTree";
export { type TableLayout, visibleColumns } from "./columns/visibleColumns";
/* ── Pagination ────────────────────────────────────────────────────── */
export { type PaginationInfo } from "./pagination/paginationMath";
export type { ExtraEntry as TableExtraEntry } from "./rows/extraRows";
export {
  type TableVirtualization,
  type VirtualItemMeta,
  type VirtualTableRow,
  windowGroupedEntries,
} from "./virtual/virtualTableModel";
/* ── Utils ─────────────────────────────────────────────────────────── */
export { type Props } from "./utils/mergeProps";
export { stableKey } from "./utils/stableKey";
/* ── Rows ──────────────────────────────────────────────────────────── */

export {
  type CellEditCommit,
  type CellEditor,
  type CellEditorOption,
  type CellEditTarget,
  type CustomCellEditorConflict,
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type EditableColumnLike,
} from "./editing/cellEditing";
export {
  type CellSpanAppearance,
  type CellSpanRequest,
  type GetCellSpan,
  type GetCellSpanArgs,
  type BodyCell as TableBodyCell,
} from "./rows/cellSpan";
export { type ExtraRow, type ExtraRowKind } from "./rows/extraRows";
export {
  applyRowPatchesToView,
  applyRowPatchLogToView,
  createIncrementalView,
  type IncrementalView,
  type IncrementalViewConfig,
} from "./rows/incremental";
export {
  applyRowPatches,
  applyRowPatchesWithLog,
  type InsertPatch,
  insertRow,
  type RekeyPatch,
  rekeyRow,
  type RemovePatch,
  removeRow,
  RowIdConflictError,
  type RowPatch,
  type RowPatchEvent,
  type RowPatchLog,
  rowPatchLog,
  type RowPatchOptions,
  rowRekeys,
  type UpdatePatch,
  updateRow,
  type UpsertPatch,
  upsertRow,
} from "./rows/patch";
export {
  allPinnedSummaryEntries,
  isPinnedSummaryRowId,
  PINNED_SUMMARY_BOTTOM_PART,
  PINNED_SUMMARY_TOP_PART,
  type PinnedRows,
  pinnedSummaryEntries,
  type PinnedSummaryEntry,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  resolvePinnedRows,
} from "./rows/pinnedSummaryRows";
export {
  type RowActionsLayout,
  type RowActionsRenderContext,
  type RowActionsRenderer,
} from "./rows/rowActions";
export {
  type RowDropPosition,
  rowDropPosition,
  type RowGroupMoveHandler,
  type RowMoveConfirmHandler,
  type RowMoveMenuModel,
  type RowMovePolicy,
  type RowMoveRequest,
  type RowMoveTarget,
  type RowReorderOptions,
  type RowTreeMoveHandler,
  type RowTreeParentRef,
  treeMoveCreatesCycle,
} from "./rows/rowMove";
export {
  applyRowReorder,
  createRowReorderController,
  datasetIndex,
  isRowMovePending,
  type RowDragEvent,
  type RowKeyEvent,
  type RowReorderActions,
  type RowReorderController,
  type RowReorderControllerOptions,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
  rowReorderRowAttributes,
  type RowReorderSlot,
  type RowReorderSnapshot,
} from "./rows/rowReorderEngine";
export { type RowHeight, type RowStyle } from "./rows/rowStyle";
export {
  bodyRowEntries,
  type BodyRowEntry,
  buildTreeEntries,
  type BuildTreeEntriesOptions,
  filterTreeRows,
  treeCardStyle,
  treeColumnKey,
  type TreeEntry,
  treeIndentStyle,
  type TreeShape,
} from "./tree/treeRows";
/* ── Row grouping ──────────────────────────────────────────────────── */
export {
  type GroupAggregateOverride,
  type GroupAggregateOverrides,
  parseGroupAggregateOverrides,
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
export type {
  GroupingPanelSource,
  GroupingPanelStateInput,
} from "./grouping/groupingPanelState";
export { type GroupByInput } from "./grouping/groupKeys";
export {
  type GroupAggregateOps,
  type GroupRowCell,
  type GroupRowLayout,
} from "./grouping/groupRowLayout";
export {
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  type GroupNode,
  type GroupPaging,
  type GroupSort,
  type RowGroupLevel,
  type RowGroupRef,
} from "./grouping/groupRows";
export type { SelectionContribution } from "./selection/selectionBindingState";
export { type QueryGroupRow } from "./source/queryGroups";
/* ── Export (CSV, and any format a writer adds) ────────────────────── */
export {
  downloadCsv,
  matrixToCsv,
  rowsToCsv,
  type RowsToCsvOptions,
} from "./export/csv";
export {
  type ExportProgressState,
  type ExportStatus,
} from "./export/exportController";
export { viewFromGroupedEntries } from "./export/exportView";
export {
  buildExportTable,
  csvWriter,
  downloadExportFile,
  type ExportPayload,
  type ExportRowMeta,
  type ExportRowRole,
  type ExportTable,
  type ExportViewEntry,
  type ExportWriteContext,
  type ExportWriter,
} from "./export/exportWriter";
export {
  buildTableCsv,
  downloadTableCsv,
  EXPORT_FETCH_ALL_MAX_ROWS,
  exportableColumns,
  type ExportAllControls,
  type ExportAllQuery,
  type ExportAllResult,
  type ExportColumnScope,
  type ExportContext,
  type ExportCsvOptions,
  type ExportInfo,
  type ExportQuery,
  type ExportRequest,
  type ExportRowScope,
  type FetchAllExport,
  fetchAllExportRows,
  makeExportCsvHandler,
  resolveExportColumns,
  resolveExportCsv,
} from "./export/tableCsv";
/* ── Types the entry's own signatures hand back ────────────────────────
 * A caller of `@adapttable/core` receives these from exported functions, so
 * they have to be nameable from the same door. Value exports keep their
 * runtime shape; the rest are types.
 */
export type { TableCommandOptions } from "./actions/commandRegistry";
export * from "./bindingExports";
export * from "./columnFilterExports";
export type {
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
} from "./columns/columnMenuModel";
export type { PinnedSide } from "./columns/columnMenuModel";
export type { GroupedHeaderAlign } from "./columns/headerGroups";
export type { ExportCsvProp } from "./export/tableCsv";
export type { FeatureHostState } from "./features/currentHost";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "./features/currentHost";
export {
  type CommandPaletteContribution,
  type ContextMenuContribution,
  type DensityContribution,
  type FindContribution,
  type FullscreenContribution,
  type PrintContribution,
} from "./features/shellOperations";
export type { BuildGroupedFlatModelOptions } from "./grouping/groupRows";
export * from "./rowFeatureExports";
export type {
  FeatureNotice,
  FeatureNoticeAppearance,
  FeatureNoticeKind,
} from "./state/featureNotices";
// Adapter machinery on the main entry, each name deprecated where it is
// declared. These shadow the same names from the barrel above, so
// `@adapttable/core/binding` and `@adapttable/react/adapter` carry no notice.
export type {
  EditCommitSnapshot,
  EditCommitValidationFailure,
  EditCommitValidationOptions,
} from "./editing/editCommitLifecycle";
export {
  type DeferredExportWriter,
  deferredExportWriter,
  deferredPdfWriter,
  deferredXlsxWriter,
  type ExportWriterOption,
} from "./export/deferredWriter";
export type { PdfWriterOptions } from "./export/pdf";
export type { PrintPageBreak, PrintPageSize } from "./export/printLayout";
export * from "./panelFeatureExports";
