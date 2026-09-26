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
export {
  cellSortValue,
  cellValue,
  resolveColumnPath,
} from "./engine/cellValue";
export {
  createTableEngine,
  type CreateTableEngineOptions,
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
export { engineSearchText } from "./engine/searchText";
// Presentation contracts for an agent write awaiting a human. Type-only: an
// adapter names them without any AI runtime reaching its graph.
export {
  resolveTableStatus,
  type TableStatusAnnouncementOptions,
  type TableStatusSignature,
} from "./a11y/statusAnnouncement";
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
  defaultConfirm,
  runRowAction,
} from "./actions/confirm";
/* ── Shared prop surface + orchestration ───────────────────────────── */
/* ── Declarative filters & data tiers ──────────────────────────────── */
export {
  type CommandListController,
  type CommandListKeyAction,
  commandListKeyAction,
  type CommandListSnapshot,
  type CommandListView,
  commandListView,
  createCommandList,
  nextCommandIndex,
  runCommand,
  tabTrapTarget,
} from "./actions/commandListModel";
export {
  commandPaletteCommands,
  type CommandPaletteCommandsOptions,
  type CommandPaletteController,
  type CommandPaletteControllerOptions,
  type CommandPaletteSnapshot,
  createCommandPaletteController,
  isCommandPaletteArmed,
  OPEN_PALETTE_COMMAND,
} from "./actions/commandPaletteController";
export type { Command } from "./actions/commandRegistry";
export { filterCommands, tableCommands } from "./actions/commandRegistry";
export type {
  ContextMenuActions,
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export {
  composeContextMenuExtra,
  type ContextMenuKeyEvent,
  type ContextMenuMoveEvent,
  type ContextMenuOpenController,
  type ContextMenuOpenControllerOptions,
  type ContextMenuOpenSnapshot,
  type ContextMenuPoint,
  type ContextMenuPointerEvent,
  type ContextMenuPressEvent,
  type ContextMenuRegionHandlers,
  type ContextMenuState,
  type ContextMenuTriggerHandlers,
  createContextMenuOpenController,
  isContextMenuArmed,
  isContextMenuKey,
} from "./actions/contextMenuOpenController";
export {
  type Aggregatable,
  type AggregatableConfig,
  type AggregateOperation,
  type AggregationSourceSupport,
  allowsOperation,
  allowsReaderOperation,
  type CustomAggregateOperation,
  impliedOperations,
  offerableOperations,
  resolveAggregatable,
  resolveAggregatableColumns,
  type ResolvedAggregatable,
  type ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export {
  aggregate,
  AGGREGATE_NAMES,
  type AggregateFormatContext,
  type AggregateName,
  type AggregateOperationId,
  type AggregateOptions,
  type AggregateOrderedValue,
  type AggregateSpec,
  type Aggregator,
  CUSTOM_AGGREGATE,
  type DeclaredAggregates,
  declaredAggregates,
  type GroupAggregatesMapper,
  toAggregateInstant,
  toAggregateOrdered,
  withDeclaredAggregates,
} from "./aggregate/aggregate";
export {
  addAggregation,
  AGGREGATE_SUPPRESSED,
  type AggregationCandidate,
  type AggregationItem,
  type AggregationModel,
  aggregationModel,
  type AggregationModelInput,
  type AggregationOrigin,
  BUILTIN_AGGREGATE_LABELS,
  columnAggregationSignature,
  computedAggregateKeys,
  declaredByDeveloper,
  effectiveAggregateOps,
  type EffectiveAggregation,
  type EffectiveAggregationInput,
  type EffectiveAggregationKind,
  initialOperation,
  readerControlAllowed,
  reconcileAggregations,
  removeAggregation,
  resolveEffectiveAggregation,
  restoreAggregationDefaults,
  serializeAggregationDerivedKey,
} from "./aggregate/aggregationModel";
export { columnText } from "./columns/columnText";
export { computed, type ComputedColumnSpec } from "./columns/computed";
export { localizedColumnPath } from "./columns/resolveColumns";
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
  asBatchGesture,
  asGesture,
  type CellEditKeyAction,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  type CellEditSession,
  type CellEditSessionOptions,
  type CellEditSnapshot,
  cellSaveFailure,
  cellSaveKey,
  cellSaveSignature,
  type CellSaveSnapshot,
  type CellSaveStatus,
  cellSaveStatus,
  type CellSaveStore,
  type CellSaveStoreOptions,
  cellsOfBatch,
  createCellEditSession,
  createCellSaveStore,
  createEditHistoryStack,
  createEditValidationStore,
  DEFAULT_EDIT_HISTORY_DEPTH,
  defaultSaveErrorMessage,
  type EditHistoryEntry,
  editHistoryEntry,
  type EditHistorySnapshot,
  type EditHistoryStack,
  type EditValidationSnapshot,
  type EditValidationStore,
  type EditValidationStoreOptions,
  type FailedCellSave,
  isCellEditActive,
  observeEdit,
  readCellValue,
  rowHasValidationError,
  type ValidationCheckResult,
  validationErrorFor,
  validationKey,
  validationSignature,
} from "./editing/editingController";
export type {
  FeatureRegistration,
  NeutralFeatureHost,
} from "./features/featureRegistration";
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
  showSimpleFilterFields,
  toolbarShowsFilters,
} from "./filters/filterChrome";
export {
  AUTO_OPTIONS_LIMIT,
  buildFilterRuntime,
  clearedFilterExtras,
  coerceBooleanValue,
  type ColumnFilter,
  FILTER_AI_OPTIONS_LIMIT,
  FILTER_TYPES,
  type FilterAiOptions,
  type FilterDef,
  filterLabel,
  type FilterOption,
  type FilterOptionsSource,
  filterPredicate,
  type FilterRuntime,
  filterStateKeys,
  type FilterType,
  materializeAutoOptions,
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
  addFilterTreeCondition,
  addFilterTreeGroup,
  emptyFilterTree,
  type FilterTreeNode,
  removeFilterTreeNode,
  replaceFilterTreeNode,
  setFilterTreeCombinator,
  walkFilterTreeConditions,
} from "./filters/filterTreeMutations";
export {
  bindHeaderFilterDismiss,
  createHeaderFilterOverlay,
  HEADER_FILTER_SESSION_ATTR,
  headerFilterFieldIsComplete,
  headerFilterInsideSelector,
  type HeaderFilterOpenHost,
  type HeaderFilterOverlayController,
  type HeaderFilterOverlayOptions,
  type HeaderFilterOverlaySnapshot,
  type HeaderFilterWrites,
  isHeaderFilterOpen,
  watchOverlayDismiss,
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
  readRangeWidget,
  writeRangeFilter,
  writeRangeWidget,
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
  clampMatchIndex,
  createFindController,
  FIND_URL_WRITE_DEBOUNCE_MS,
  type FindController,
  type FindControllerOptions,
  type FindSnapshot,
  readFindQuery,
} from "./find/findController";
export {
  findMatches,
  type FindMatchesOptions,
  matchKey,
  matchKeySet,
  stepMatch,
} from "./find/findMatches";
export { batchEditHandler, type CellEdit } from "./focus/cellEdits";
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
  createGridFocusController,
  GRID_CELL_ATTR,
  gridCellAttr,
  type GridCellAttributes,
  gridCellAttributes,
  type GridCellAttributesInput,
  gridColumnHeaderAttributes,
  type GridContainerAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusController,
  type GridFocusControllerOptions,
  type GridFocusSnapshot,
  type GridKeyEvent,
  gridRowAttributes,
  isGridColumnSelected,
  type PointerReleaseTarget,
} from "./focus/gridFocusController";
export {
  cellFillHandler,
  type CellFillHandlerOptions,
  cellPasteHandler,
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
  type QueryExtensions,
  type QueryFilterGroup,
  type QuerySupport,
} from "./source/queryContract";
export {
  tableQueryBaseKey,
  tableQueryKey,
  type TableQueryKeyOptions,
} from "./source/queryKey";
export {
  type ControllableControl,
  type ControllableStore,
  type ControllableStoreOptions,
  createControllableStore,
} from "./state/controllableStore";
export type { Slot, TableErrorState } from "./state/errorState";
export {
  applyRowPin,
  groupsCollapsedToDepth,
  headerSelectionOf,
  idSetReader,
  initialColumnLayout,
  type LayoutStorage,
  offersAllMatching,
  readStoredColumnLayout,
  rowPinSideOf,
  sameRowPins,
  sanitizeStoredLayout,
  toggleId,
  toggleIds,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
  withColumnWidth,
} from "./state/tableStores";
export { isBrowser } from "./utils/env";
export { humanizeKey } from "./utils/humanizeKey";
export { normalizeLocaleTag, resolveLocaleTag } from "./utils/localeTag";
export { getPath } from "./utils/path";
/* ── Labels ────────────────────────────────────────────────────────── */
export { defaultLabels, resolveLabels } from "./labels";
/* ── Constants ─────────────────────────────────────────────────────── */
export {
  DEFAULT_CARD_SIZE_PX,
  DEFAULT_LIMIT,
  DEFAULT_ROW_SIZE_PX,
  MOBILE_BREAKPOINT_PX,
  PAGE_SIZE_OPTIONS,
  pageSizeOptions,
  SEARCH_DEBOUNCE_MS,
  VIRTUAL_OVERSCAN,
} from "./constants";
export type { DisplayValue } from "./display";
export {
  type ChecklistValue,
  collectChecklistValues,
} from "./filters/checklistValues";
export type { ChipLabelResolver } from "./filters/filterDefs";
export {
  type FilterFormSource,
  listFilterValues,
} from "./filters/filterFormModel";
export { formulaSlice } from "./formula/formulaUrlSlice";
export { pivotSlice } from "./pivot/pivotUrlSlice";
export type { CssProperties } from "./style/cssProperties";
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  resetHistoryAdapter,
  resolveUrlAdapter,
} from "./url/historyAdapter";
export {
  routerUrlAdapter,
  type RouterUrlAdapterOptions,
} from "./url/routerAdapter";
export {
  createSavedViewsController,
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewMigration,
  type SavedViewsController,
  type SavedViewsControllerOptions,
  type SavedViewsSnapshot,
  type SavedViewsStore,
  type SavedViewVisibility,
} from "./url/savedViewsController";
export type { UrlStateAdapter } from "./url/urlStateAdapter";
export {
  columnLayoutSlice,
  densitySlice,
  groupCollapseSlice,
  rowPinningSlice,
  type TableDensity,
  URL_SLICE_WRITE_DEBOUNCE_MS,
} from "./url/viewStateSlices";
export {
  createTableViewStore,
  createUrlSliceStore,
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlSliceSpec,
  type UrlSliceStore,
  type ViewStateSource,
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
  appendBaseKey,
  appendedRows,
  type AppendStash,
  buildTableQuery,
  canRequestCursorPage,
  clampedPage,
  createFilterOptionsLoader,
  createFirstLoadLatch,
  createQueryEmitter,
  cursorHasMore,
  type CursorTrail,
  type DataTier,
  effectiveQueryAggregates,
  EMPTY_CURSOR_TRAIL,
  type FilterOptionsLoader,
  type FirstLoadLatch,
  type InfiniteQueryLike,
  type LoadedFilterOption,
  type PageSelector,
  queryAggregationSource,
  type QueryEmitter,
  queryGroupBy,
  recordCursor,
  resolveDataTier,
  staleAppendStash,
  type TableQueryInput,
  type TableQueryListener,
  warnDataTierMisuse,
} from "./source/dataTier";
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
export {
  compareValues,
  type SortLevel,
  sortRows,
  sortRowsMulti,
} from "./sort/compare";
export { nextSort } from "./sort/cycleSort";
/* ── Columns ───────────────────────────────────────────────────────── */
export { autoSizeColumns, measureColumnWidth } from "./columns/autoSizeColumns";
export { columnHeaderLabel } from "./columns/columnHeader";
export {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuLabel,
  columnMenuRows,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
export { columnResizeHandleProps } from "./columns/columnResize";
export {
  type ColumnGroupDef,
  type ColumnGroupRecord,
  type ColumnInput,
  type FlattenedColumns,
  isColumnGroup,
  marriedOrderHolds,
} from "./columns/columnTree";
export {
  parsePxWidth,
  resolveColumnWidth,
  tableMinWidth,
} from "./columns/columnWidths";
export { type TableLayout, visibleColumns } from "./columns/visibleColumns";
/* ── Pagination ────────────────────────────────────────────────────── */
export {
  computePagination,
  type PaginationInfo,
} from "./pagination/paginationMath";
export type { ExtraEntry as TableExtraEntry } from "./rows/extraRows";
export {
  type TableVirtualization,
  type VirtualItemMeta,
  type VirtualTableRow,
  windowGroupedEntries,
} from "./virtual/virtualTableModel";
/* ── Utils ─────────────────────────────────────────────────────────── */
export { mergeProps, type Props } from "./utils/mergeProps";
export { stableKey } from "./utils/stableKey";
/* ── Rows ──────────────────────────────────────────────────────────── */

export {
  booleanDraft,
  type CellEditCommit,
  type CellEditor,
  type CellEditorOption,
  type CellEditTarget,
  type CustomCellEditorConflict,
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type EditableColumnLike,
  editorInputType,
  formatMultiDraft,
  hasEditableColumns,
  isBooleanEditor,
  isCellEditable,
  isCustomEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  MULTI_SEPARATOR,
  normalizeEditorOptions,
  parseCellEditValue,
  readMultiDraft,
  resolveCellEditor,
} from "./editing/cellEditing";
export {
  buildBodyCells,
  type CellSpanAppearance,
  type CellSpanRequest,
  coveredAddressSet,
  type GetCellSpan,
  type GetCellSpanArgs,
  spanningArmed,
  type BodyCell as TableBodyCell,
} from "./rows/cellSpan";
export {
  type ExtraRow,
  type ExtraRowKind,
  extraRowsArmed,
} from "./rows/extraRows";
export {
  applyRowPatchesToView,
  applyRowPatchLogToView,
  attachIncrementalView,
  configureIncrementalView,
  createIncrementalView,
  incrementalSearchText,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewConfig,
  incrementalViewOf,
} from "./rows/incremental";
export {
  applyRowPatches,
  applyRowPatchesWithLog,
  type InsertPatch,
  insertRow,
  type RemovePatch,
  removeRow,
  type RowPatch,
  type RowPatchEvent,
  type RowPatchLog,
  rowPatchLog,
  type UpdatePatch,
  updateRow,
  type UpsertPatch,
  upsertRow,
} from "./rows/patch";
export {
  allPinnedSummaryEntries,
  EMPTY_PINNED_ROWS,
  isPinnedSummaryRowId,
  PINNED_SUMMARY_BOTTOM_PART,
  PINNED_SUMMARY_KEY_PREFIX,
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
  visibleRowActions,
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
  defaultRowReorderAnnouncements,
  isRowMovePending,
  resolveRowMove,
  type RowDragEvent,
  type RowKeyEvent,
  type RowMoveDrop,
  rowMoveMenu,
  type RowMoveView,
  type RowReorderAnnouncements,
  rowReorderAnnouncements,
  type RowReorderController,
  type RowReorderControllerOptions,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
  rowReorderRowAttributes,
  type RowReorderSlot,
  type RowReorderSnapshot,
} from "./rows/rowReorderEngine";
export {
  estimateFromRowHeight,
  type RowHeight,
  type RowStyle,
  rowStyleArmed,
} from "./rows/rowStyle";
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
  queryAggregateOps,
  serializeGroupAggregateOverrides,
  withGroupAggregateOverrides,
  withQueryAggregateOverrides,
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
export {
  formatGroupBy,
  type GroupByInput,
  parseGroupBy,
} from "./grouping/groupKeys";
export {
  groupAggregateEntries,
  groupAggregateNode,
  type GroupAggregateOps,
  groupLeafCount,
  type GroupRowCell,
  type GroupRowLayout,
  groupRowLayout,
} from "./grouping/groupRowLayout";
export {
  buildGroupedFlatModel,
  formatGroupLabel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  type GroupNode,
  type GroupPaging,
  type GroupSort,
  groupValueKey,
  type RowGroupLevel,
  type RowGroupRef,
} from "./grouping/groupRows";
export { groupSelectionState } from "./grouping/groupSelection";
export {
  type QueryGroupRow,
  type QueryGroupsPage,
  serverGroupEntries,
  type ServerGroupEntriesOptions,
} from "./source/queryGroups";
/* ── Export (CSV, and any format a writer adds) ────────────────────── */
export {
  downloadCsv,
  matrixToCsv,
  rowsToCsv,
  type RowsToCsvOptions,
} from "./export/csv";
export {
  createExportController,
  type ExportController,
  type ExportControllerOptions,
  type ExportProgressState,
  type ExportRunHandler,
  type ExportSnapshot,
  type ExportStatus,
  resolveExportAnnouncement,
  resolveExportDisabledReason,
  resolveExportProgressState,
} from "./export/exportController";
export {
  exportViewFromChrome,
  filterExportView,
  summaryExportValues,
  viewFromGroupedEntries,
  viewFromTreeEntries,
} from "./export/exportView";
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
export type {
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
} from "./columns/columnMenuModel";
export type { PinnedSide } from "./columns/columnMenuModel";
export type { ColumnResizeHandleProps } from "./columns/columnResize";
export type { WidthColumn } from "./columns/columnWidths";
export type { GroupedHeaderAlign } from "./columns/headerGroups";
export type { ExportCsvProp } from "./export/tableCsv";
export type { FeatureHostState } from "./features/currentHost";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "./features/currentHost";
export type { BuildGroupedFlatModelOptions } from "./grouping/groupRows";
export type {
  FeatureNotice,
  FeatureNoticeAppearance,
  FeatureNoticeKind,
} from "./state/featureNotices";
// Adapter machinery on the main entry, each name deprecated where it is
// declared. These shadow the same names from the barrel above, so
// `@adapttable/core/binding` and `@adapttable/react/adapter` carry no notice.
export {
  applyCollapsedColumnGroups,
  type BodyCell,
  bodyCellsHaveRowSpan,
  buildTableXlsx,
  cellsForRow,
  cellSpanMark,
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  columnMenuActions,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraHostFillStyle,
  extraRowsForSection,
  extraUncoveredColSpans,
  filterColumnMenuRows,
  flattenColumnTree,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  headerGroupRow,
  headerGroupRows,
  hideAllColumns,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  isExtraEntry,
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
  REORDER_COLUMN_WIDTH,
  resetColumnLayout,
  resolveRowHeight,
  resolveRowStyle,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSourceIndex,
  rowSpanSignature,
  rowStyleSignature,
  showAllColumns,
  toggleCollapsedColumnGroup,
  unpinAllColumns,
  xlsxWriter,
} from "./adapterMachinery";
