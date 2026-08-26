/**
 * `@adapttable/core` — the headless engine behind AdaptTable.
 *
 * Zero UI-kit, i18n-library, or router imports. Exposes the unified
 * {@link TableSource} contract, the `useFrontendData` / `useServerData` /
 * `useQuerySource` source builders, URL-synced state with an injectable adapter, filter
 * chips, selection, and the `useDataTable` prop-getter API.
 *
 * @packageDocumentation
 */

/* ── Types ─────────────────────────────────────────────────────────── */
export type {
  ActionConfirm,
  BulkAction,
  BulkActionContext,
  CellProps,
  ColorScheme,
  ColumnDef,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  ColumnHeaderController,
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
export {
  type BulkActionOutcome,
  type BulkActionRunner,
  useBulkActionRunner,
  type UseBulkActionRunnerOptions,
} from "./actions/useBulkActionRunner";

/* ── Shared prop surface + orchestration ───────────────────────────── */
/* ── Declarative filters & data tiers ──────────────────────────────── */
export type { Command } from "./actions/commandRegistry";
export { filterCommands, tableCommands } from "./actions/commandRegistry";
export type {
  ContextMenuActions,
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export {
  DEFAULT_SHORTCUTS,
  type Shortcut,
  useShortcuts,
} from "./actions/useShortcuts";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export {
  aggregate,
  AGGREGATE_NAMES,
  type AggregateName,
  type AggregateOptions,
  type AggregateSpec,
  type Aggregator,
} from "./aggregate/aggregate";
export { columnText } from "./columns/columnText";
export { computed, type ComputedColumnSpec } from "./columns/computed";
export { localizedColumnPath, resolveColumns } from "./columns/resolveColumns";
export type { TableFeature, TableFeatureHost } from "./features/tableFeature";
export {
  CHECKLIST_ITEM_HEIGHT,
  CHECKLIST_LIST_HEIGHT,
  CHECKLIST_VIRTUALIZE_AT,
  type ChecklistFilterState,
  type ChecklistValue,
  collectChecklistValues,
  useChecklistFilter,
} from "./filters/checklist";
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
  FILTER_TYPES,
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
  type BooleanChoice,
  type BooleanFieldWidget,
  type DateOp,
  type FilterFormSource,
  filterOpLabel,
  listFilterValues,
  type NumberOp,
  parseBooleanChoice,
  type RangeFieldWidget,
  type RangeOpArity,
  type RangeOpLabelKeys,
  scalarFilterText,
  type TextFieldWidget,
  type TextOp,
  useBooleanFilterWidget,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "./filters/filterForm";
export {
  filterDefForColumn,
  headerFilterStickTop,
} from "./filters/FilterHeaderRow";
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
  headerFilterFieldIsComplete,
  type HeaderFilterSessionProps,
  useHeaderFilterOverlay,
  usePointerDismiss,
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
  type ResolvedFilterOptions,
  useFilterOptions,
} from "./filters/useFilterOptions";
export {
  filterTreeChipLabel,
  useFilterTreeChips,
  type UseFilterTreeChipsOptions,
} from "./filters/useFilterTreeChips";
export {
  findMatches,
  type FindMatchesOptions,
  matchKey,
  matchKeySet,
  stepMatch,
} from "./find/findMatches";
export {
  type FindInTableState,
  useFindFocus,
  useFindInTable,
  type UseFindInTableOptions,
} from "./find/useFindInTable";
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
export {
  GRID_CELL_ATTR,
  gridCellAttr,
  type GridFocusState,
  useGridFocus,
  type UseGridFocusOptions,
} from "./focus/useGridFocus";
export type { SidePanelEntry } from "./layout/SidePanelChrome";
export type {
  BaseDataTableProps,
  SidePanelOptions,
  ToolbarSlots,
} from "./props";
export type {
  MobileCardField,
  MobileCardModel,
  MobileCardRenderer,
} from "./rows/mobileCard";
export {
  type HighlightedCell,
  type HighlightState,
  useHighlight,
} from "./rows/useHighlight";
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
  type TableQuery,
  useServerData,
  type UseServerDataOptions,
} from "./source/useServerData";
export {
  isDeclarativeFilters,
  useTableData,
  type UseTableDataOptions,
  type UseTableDataResult,
} from "./source/useTableData";
export type { Slot, TableErrorState } from "./state/errorState";
export {
  type Density,
  useDensityUrlState,
  type UseDensityUrlStateOptions,
  type UseDensityUrlStateResult,
} from "./url/useDensityUrlState";
export {
  type ChromeBodyData,
  type FeatureNotice,
  type FeatureNoticeKind,
  type TableChrome,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
} from "./useTableChrome";
export { humanizeKey } from "./utils/humanizeKey";
export { normalizeLocaleTag, resolveLocaleTag } from "./utils/localeTag";
export { getPath } from "./utils/path";

/* ── Labels ────────────────────────────────────────────────────────── */
export { defaultLabels, resolveLabels } from "./labels";

/* ── Constants ─────────────────────────────────────────────────────── */
export {
  DEFAULT_LIMIT,
  PAGE_SIZE_OPTIONS,
  pageSizeOptions,
  SEARCH_DEBOUNCE_MS,
} from "./constants";

/* ── URL state ─────────────────────────────────────────────────────── */

export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  type UrlStateAdapter,
} from "./url/adapter";
export {
  routerUrlAdapter,
  type RouterUrlAdapterOptions,
} from "./url/routerAdapter";
export {
  useColumnLayoutUrlState,
  type UseColumnLayoutUrlStateOptions,
  type UseColumnLayoutUrlStateResult,
} from "./url/useColumnLayoutUrlState";
export {
  SAVED_VIEW_VERSION,
  type SavedView,
  type SavedViewMigration,
  type SavedViewsStore,
  type SavedViewVisibility,
  useSavedViews,
  type UseSavedViewsOptions,
  type UseSavedViewsResult,
} from "./url/useSavedViews";
export {
  useTableUrlState,
  type UseTableUrlStateOptions,
  type UseTableUrlStateResult,
} from "./url/useTableUrlState";

/* ── Shared render contracts ───────────────────────────────────────── */

/* ── Sources ───────────────────────────────────────────────────────── */
export type { TableSource } from "./source/TableSource";
export {
  defaultFrontendRowId,
  defaultSearchText,
  useFrontendData,
  type UseFrontendDataOptions,
} from "./source/useFrontendData";
export {
  type InfiniteQueryLike,
  type PageSelector,
  useQuerySource,
  type UseQuerySourceOptions,
} from "./source/useQuerySource";
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
export {
  type ActiveFilterChip,
  type ChipLabelResolver,
  useActiveFilterChips,
  type UseActiveFilterChipsOptions,
} from "./filters/useActiveFilterChips";
export {
  useExtraChips,
  type UseExtraChipsOptions,
} from "./filters/useExtraChips";

/* ── Selection ─────────────────────────────────────────────────────── */
export {
  type HeaderSelectionState,
  type SelectionState,
  useSelection,
  type UseSelectionOptions,
} from "./selection/useSelection";

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
export {
  columnHeaderController,
  columnHeaderLabel,
  columnsHaveFooter,
  resolveColumnFooter,
  resolveColumnHeader,
} from "./columns/columnHeader";
export {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuLabel,
  columnMenuRows,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
export {
  columnDropProps,
  columnReorderKeyProps,
  columnRowDragProps,
  useColumnDragState,
} from "./columns/columnReorder";
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
export {
  type ColumnLayoutState,
  edgePinStyle,
  PIN_Z,
  pinnedCellStyle,
  type PinSide,
  useColumnLayout,
  type UseColumnLayoutOptions,
  type UseColumnLayoutResult,
} from "./columns/useColumnLayout";
export {
  type LayoutStorage,
  useColumnLayoutStorageState,
  type UseColumnLayoutStorageStateOptions,
  type UseColumnLayoutStorageStateResult,
} from "./columns/useColumnLayoutStorageState";
export { type TableLayout, visibleColumns } from "./columns/visibleColumns";
export { useHorizontalOverflow } from "./layout/useHorizontalOverflow";

/* ── Pagination ────────────────────────────────────────────────────── */
export {
  computePagination,
  type PaginationInfo,
} from "./pagination/paginationMath";

/* ── Hooks ─────────────────────────────────────────────────────────── */
export { useColorScheme } from "./hooks/useColorScheme";
export { useDebounce } from "./hooks/useDebounce";
export {
  useInfiniteScroll,
  type UseInfiniteScrollOptions,
} from "./hooks/useInfiniteScroll";
export { useIsMobile } from "./hooks/useIsMobile";
export { useMediaQuery } from "./hooks/useMediaQuery";
export { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
export {
  useScrollToTableTop,
  type UseScrollToTableTopOptions,
} from "./hooks/useScrollToTableTop";

/* ── Orchestrator ──────────────────────────────────────────────────── */
export {
  type CellElementProps,
  type RowElementProps,
  type SearchInputElementProps,
  type SortButtonElementProps,
  type TableElementProps,
  useDataTable,
  type UseDataTableOptions,
  type UseDataTableResult,
} from "./useDataTable/useDataTable";
export { useSearchInput } from "./useDataTable/useSearchInput";

/* ── Virtualization ───────────────────────────────────────────────── */
export {
  type TableVirtualization,
  useTableVirtualization,
  type UseTableVirtualizationOptions,
  windowGroupedEntries,
} from "./virtual/useTableVirtualization";

/* ── Utils ─────────────────────────────────────────────────────────── */
export { mergeProps, type Props } from "./utils/mergeProps";
export { stableKey } from "./utils/stableKey";

/* ── Rows ──────────────────────────────────────────────────────────── */

export {
  buildBodyCells,
  type CellSpanAppearance,
  type CellSpanRequest,
  coveredAddressSet,
  type GetCellSpan,
  type GetCellSpanArgs,
  spanningArmed,
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
  type RowActionsLayout,
  type RowActionsRenderContext,
  type RowActionsRenderer,
  visibleRowActions,
} from "./rows/rowActions";
export {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  type RowMutationHandlers,
  type RowMutationsState,
  useRowMutations,
  type UseRowMutationsOptions,
} from "./rows/rowMutations";
export {
  applyRowPin,
  EMPTY_ROW_PIN_STATE,
  partitionPinnedRows,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  type RowPinLabels,
  type RowPinningState,
  type RowPinSide,
  type RowPinState,
  UNPIN_ROW_ACTION_KEY,
  useRowPinning,
} from "./rows/rowPinning";
export {
  applyRowReorder,
  datasetIndex,
  type RowReorderHandler,
  type RowReorderLabels,
  useRowReorder,
} from "./rows/rowReorder";
export {
  estimateFromRowHeight,
  type RowHeight,
  type RowStyle,
  rowStyleArmed,
} from "./rows/rowStyle";
export {
  type RowExpansionState,
  useRowExpansion,
} from "./rows/useRowExpansion";

/* ── Hierarchical (tree) rows ──────────────────────────────────────── */
export {
  type NestedTable,
  type NestedTableDefaults,
  type NestedTableFor,
} from "./tree/nestedTable";
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
export {
  type LazyChildrenState,
  useLazyChildren,
  type UseLazyChildrenOptions,
} from "./tree/useLazyChildren";
export {
  type TreeExpansionState,
  useTreeExpansion,
} from "./tree/useTreeExpansion";

/* ── Inline cell editing ───────────────────────────────────────────── */
export {
  type BatchEditingState,
  type BatchRowEdit,
  useBatchEditing,
  type UseBatchEditingOptions,
} from "./editing/batchEditing";
export {
  booleanDraft,
  type CellEditCommit,
  type CellEditor,
  type CellEditorOption,
  type CellEditTarget,
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
  type DirtyCellState,
  useDirtyCells,
  type UseDirtyCellsOptions,
} from "./editing/dirtyCells";
export {
  type EditableCellController,
  type EditableCellEditing,
  type EditableCellMode,
} from "./editing/editableCellController";
export {
  type EditableCellEditorCtrl,
  EditableCellGate,
  type EditableCellGateProps,
} from "./editing/EditableCellGate";
export {
  type EditConflict,
  type EditConflictChoice,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  liveRowChanged,
  type ReconcileLiveEdit,
  useEditConflict,
} from "./editing/editConflict";
export {
  asGesture,
  type EditHistoryEntry,
  type EditHistoryState,
  readCellValue,
  type TableEditHistoryProps,
  useEditHistory,
  type UseEditHistoryOptions,
  useTableEditHistory,
} from "./editing/editHistory";
export {
  type EditEvent,
  type EditEventHandler,
  type EditLifecycle,
  type EditUnit,
} from "./editing/editingEvents";
export {
  type MultiSelectEditorCheckboxProps,
  MultiSelectEditorChrome,
  type MultiSelectEditorChromeProps,
  type MultiSelectEditorSlots,
} from "./editing/MultiSelectEditorChrome";
export {
  type RowEditDrafts,
  type RowEditingState,
  useRowEditing,
  type UseRowEditingOptions,
} from "./editing/rowEditing";
export {
  type CellSaveState,
  type CellSaveStatus,
  type FailedCellSave,
  useCellSaveState,
  type UseCellSaveStateOptions,
} from "./editing/saveState";
export {
  type CellEditingState,
  type CellEditKeyAction,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  useCellEditing,
  type UseCellEditingOptions,
} from "./editing/useCellEditing";

/* ── Row grouping ──────────────────────────────────────────────────── */
export {
  formatGroupBy,
  type GroupByInput,
  parseGroupBy,
} from "./grouping/groupKeys";
export {
  groupAggregateEntries,
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
} from "./grouping/groupRows";
export { groupSelectionState } from "./grouping/groupSelection";
export {
  type GroupCollapseState,
  useGroupCollapse,
} from "./grouping/useGroupCollapse";
export {
  type GroupPagingState,
  useGroupPaging,
} from "./grouping/useGroupPaging";
export {
  type QueryGroupRow,
  type QueryGroupsPage,
  serverGroupEntries,
  type ServerGroupEntriesOptions,
} from "./source/queryGroups";
export {
  useGroupCollapseUrlState,
  type UseGroupCollapseUrlStateOptions,
  type UseGroupCollapseUrlStateResult,
} from "./url/useGroupCollapseUrlState";
export {
  useRowPinningUrlState,
  type UseRowPinningUrlStateOptions,
  type UseRowPinningUrlStateResult,
} from "./url/useRowPinningUrlState";

/* ── Export (CSV, and any format a writer adds) ────────────────────── */
export {
  downloadCsv,
  matrixToCsv,
  rowsToCsv,
  type RowsToCsvOptions,
} from "./export/csv";
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

/* ── Adapter machinery (deprecated on the main entry; gone at v3) ──── */
export * from "./mainEntryAliases";
