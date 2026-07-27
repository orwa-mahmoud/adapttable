/**
 * `@adapttable/core` — the headless engine behind AdaptTable.
 *
 * Zero UI-kit, i18n-library, or router imports. Exposes the unified
 * {@link TableSource} contract, the `useFrontendData` / `useBackendData`
 * source builders, URL-synced state with an injectable adapter, filter
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
  resolveDisabledReason,
  runRowAction,
} from "./actions/confirm";
export {
  bulkActionErrorMessage,
  type BulkActionOutcome,
  type BulkActionRunner,
  useBulkActionRunner,
  type UseBulkActionRunnerOptions,
} from "./actions/useBulkActionRunner";
export {
  type BulkBarState,
  useBulkBarState,
  type UseBulkBarStateOptions,
} from "./actions/useBulkBarState";

/* ── Shared prop surface + orchestration ───────────────────────────── */
/* ── Declarative filters & data tiers ──────────────────────────────── */
export { resolveColumns } from "./columns/resolveColumns";
export {
  AUTO_OPTIONS_LIMIT,
  buildFilterRuntime,
  clearedFilterExtras,
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
  type FilterFormSource,
  listFilterValues,
  type RangeFieldWidget,
  type RangeOpLabelKeys,
  scalarFilterText,
  useRangeFilterWidget,
} from "./filters/filterForm";
export {
  RANGE_OP_LABEL_KEYS,
  RANGE_OPS,
  type RangeOp,
  type RangeWidgetState,
  readRangeWidget,
  writeRangeWidget,
} from "./filters/rangeWidget";
export {
  type ResolvedFilterOptions,
  useFilterOptions,
} from "./filters/useFilterOptions";
export type { BaseDataTableProps } from "./props";
export {
  type TableQuery,
  useServerData,
  type UseServerDataOptions,
} from "./source/useServerData";
export {
  type DataModeProps,
  isDeclarativeFilters,
  useTableData,
  type UseTableDataOptions,
  type UseTableDataResult,
} from "./source/useTableData";
export {
  type DataTableShellProps,
  useDataTableShell,
} from "./useDataTableShell";
export {
  type BulkBarChromeProps,
  type ChromeBodyData,
  type FilterTriggerToggle,
  type TableBodyRegion,
  type TableChrome,
  type ToolbarChromeProps,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
} from "./useTableChrome";
export { humanizeKey } from "./utils/humanizeKey";
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

/* ── URL state ─────────────────────────────────────────────────────── */
export { type HeaderGroupCell, headerGroupRow } from "./columns/headerGroups";
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  type UrlStateAdapter,
  useResolvedAdapter,
} from "./url/adapter";
export {
  useColumnLayoutUrlState,
  type UseColumnLayoutUrlStateOptions,
  type UseColumnLayoutUrlStateResult,
} from "./url/useColumnLayoutUrlState";
export {
  type SavedView,
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
export {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "./tableRenderProps";

/* ── Sources ───────────────────────────────────────────────────────── */
export type { TableSource } from "./source/TableSource";
export {
  type InfiniteQueryLike,
  type PageSelector,
  useQuerySource,
  type UseQuerySourceOptions,
} from "./source/useQuerySource";
// Alias for `useQuerySource` (v1 name) — deleted before the 2.0.0 release.
export {
  useBackendData,
  type UseBackendDataOptions,
} from "./source/useBackendData";
export {
  defaultSearchText,
  useFrontendData,
  type UseFrontendDataOptions,
} from "./source/useFrontendData";
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
  mergeFilterChips,
  resolveActiveFilterCount,
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
export { nextSort, type SortState } from "./sort/cycleSort";
export { deriveSortByOptions } from "./sort/sortByOptions";

/* ── Columns ───────────────────────────────────────────────────────── */
export {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuChromeProps,
  columnMenuLabel,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  columnMenuRows,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
} from "./columns/columnMenuModel";
export {
  COLUMN_DND_MIME,
  type ColumnDragRowAttrs,
  type ColumnDragState,
  type ColumnDropProps,
  columnDropProps,
  type ColumnReorderKeyProps,
  columnReorderKeyProps,
  type ColumnRowDragProps,
  columnRowDragProps,
  useColumnDragState,
} from "./columns/columnReorder";
export {
  COLUMN_RESIZE_STEP,
  type ColumnResizeHandleProps,
  columnResizeHandleProps,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
} from "./columns/columnResize";
export {
  FALLBACK_PIN_WIDTH,
  parsePxWidth,
  pinnedColumnWidth,
  resolveColumnWidth,
  tableMinWidth,
} from "./columns/columnWidths";
export { EyeIcon, GripIcon, PinIcon } from "./columns/icons";
export {
  type ColumnLayoutState,
  edgePinStyle,
  EMPTY_COLUMN_LAYOUT,
  PIN_Z,
  type PinLeads,
  type PinnedCellStyle,
  pinnedCellStyle,
  type PinOffset,
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
export {
  logicalAlign,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  sortArrow,
} from "./display";
export { ExpandChevron, FiltersIcon, SearchIcon } from "./icons";
export {
  type HorizontalOverflow,
  useHorizontalOverflow,
} from "./layout/useHorizontalOverflow";

/* ── Pagination ────────────────────────────────────────────────────── */
export {
  computePagination,
  type PaginationInfo,
  type PaginationItem,
  paginationItems,
  type PaginationSlot,
  paginationSlots,
} from "./pagination/paginationMath";

/* ── Hooks ─────────────────────────────────────────────────────────── */
export { DARK_SCHEME_QUERY, useColorScheme } from "./hooks/useColorScheme";
export { useDebounce } from "./hooks/useDebounce";
export {
  useInfiniteScroll,
  type UseInfiniteScrollOptions,
} from "./hooks/useInfiniteScroll";
export {
  MOBILE_MEDIA_QUERY,
  resolvePaginationMode,
  useIsMobile,
} from "./hooks/useIsMobile";
export { useMediaQuery } from "./hooks/useMediaQuery";
export {
  type MountStaggerOptions,
  useMountStagger,
} from "./hooks/useMountStagger";
export {
  REDUCED_MOTION_QUERY,
  usePrefersReducedMotion,
} from "./hooks/usePrefersReducedMotion";
export {
  useScrollToTableTop,
  type UseScrollToTableTopOptions,
} from "./hooks/useScrollToTableTop";

/* ── Orchestrator ──────────────────────────────────────────────────── */
export {
  type CellElementProps,
  type SearchInputElementProps,
  type SortButtonElementProps,
  type TableElementProps,
  useDataTable,
  type UseDataTableOptions,
  type UseDataTableResult,
} from "./useDataTable/useDataTable";
export {
  type SearchInputState,
  useSearchInput,
} from "./useDataTable/useSearchInput";

/* ── Virtualization ───────────────────────────────────────────────── */
export {
  type KeyedVirtualization,
  resolveVirtualRows,
  type TableVirtualization,
  useKeyedVirtualization,
  useTableVirtualization,
  type UseTableVirtualizationOptions,
  virtualColumnSpan,
  type VirtualTableRow,
  windowGroupedEntries,
} from "./virtual/useTableVirtualization";

/* ── Utils ─────────────────────────────────────────────────────────── */
export { mergeProps, type Props } from "./utils/mergeProps";
export { stableKey } from "./utils/stableKey";

/* ── Rows ──────────────────────────────────────────────────────────── */
export { type RowClickProps, rowClickProps } from "./rows/rowClickProps";
export {
  type RowExpansionState,
  useRowExpansion,
} from "./rows/useRowExpansion";

/* ── Inline cell editing ───────────────────────────────────────────── */
export {
  applyCellEditCommit,
  type CellEditCommit,
  type CellEditor,
  type CellEditorOption,
  type CellEditTarget,
  type EditableColumnLike,
  hasEditableColumns,
  isCellEditable,
  nextEditableCell,
  normalizeEditorOptions,
  parseCellEditValue,
  readEditableCellValue,
  resolveCellEditor,
  stepEditableCell,
} from "./editing/cellEditing";
export {
  type EditableCellController,
  editableCellController,
  type EditableCellEditing,
  type EditableCellMode,
  focusEditorOnMount,
  rowEditingSignature,
  stopCellEditKeyboard,
} from "./editing/editableCellController";
export {
  type EditableCellEditorCtrl,
  EditableCellGate,
  type EditableCellGateProps,
} from "./editing/EditableCellGate";
export {
  beginCellEdit,
  type CellEditingState,
  type CellEditKeyAction,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  useCellEditing,
} from "./editing/useCellEditing";

/* ── Row grouping ──────────────────────────────────────────────────── */
export {
  buildGroupedFlatModel,
  formatGroupLabel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  groupValueKey,
  makeGroupRowKey,
  resolveGroupValue,
} from "./grouping/groupRows";
export {
  applyGroupLeafSelection,
  groupSelectionState,
  nextGroupSelection,
} from "./grouping/groupSelection";
export {
  type GroupCollapseState,
  useGroupCollapse,
} from "./grouping/useGroupCollapse";

/* ── Export (CSV) ──────────────────────────────────────────────────── */
export { downloadCsv, rowsToCsv, type RowsToCsvOptions } from "./export/csv";
export {
  buildTableCsv,
  downloadTableCsv,
  exportableColumns,
  type ExportCsvOptions,
  makeExportCsvHandler,
  resolveExportCsv,
} from "./export/tableCsv";
