/**
 * `@adapttable/react` — headless React binding and structural Chrome.
 *
 * @packageDocumentation
 */
export {
  type BulkActionOutcome,
  type BulkActionRunner,
  useBulkActionRunner,
  type UseBulkActionRunnerOptions,
} from "./actions/useBulkActionRunner";
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export {
  DEFAULT_SHORTCUTS,
  type Shortcut,
  useShortcuts,
} from "./actions/useShortcuts";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export { aggregate } from "./aggregate/aggregate";
export type {
  CellProps,
  ColumnDef,
  ColumnFooterContext,
  ColumnHeaderContext,
  ColumnHeaderController,
  ColumnInput,
  ReactColumnGroupDef,
} from "./columnDef";
export {
  columnHeaderController,
  columnsHaveFooter,
  resolveColumnFooter,
  resolveColumnHeader,
} from "./columns/columnHeader";
export { computed, type ReactComputedColumnSpec } from "./columns/computed";
export {
  resolveColumns,
  resolveNeutralColumnHeaders,
} from "./columns/resolveColumns";
export { useTableEngine } from "./engine/useTableEngine";
export type {
  FeatureProviderContribution,
  FeatureProviderProps,
  FeatureRender,
  FeatureSlotKey,
} from "./features/providers";
export type {
  FeatureApplyInput,
  FeaturePatch,
  StaticFeatureHost,
  StaticTableFeature,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
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
  bindHeaderFilterDismiss,
  headerFilterFieldIsComplete,
  HeaderFilterOpenContext,
  type HeaderFilterOpenHost,
  HeaderFilterOpenProvider,
  type HeaderFilterSessionProps,
  useHeaderFilterOverlay,
  usePointerDismiss,
} from "./filters/headerFilterOverlay";
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
  FIND_URL_WRITE_DEBOUNCE_MS,
  type FindInTableState,
  useFindFocus,
  useFindInTable,
  type UseFindInTableOptions,
} from "./find/useFindInTable";
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
  ComposedTableProps,
  FeatureProps,
  SidePanelOptions,
  SummaryRowFn,
  ToolbarSlots,
} from "./props";
export type {
  ReactMobileCardField,
  ReactMobileCardModel,
  ReactMobileCardRenderer,
} from "./rows/mobileCard";
export {
  type HighlightedCell,
  type HighlightState,
  useHighlight,
} from "./rows/useHighlight";
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
export {
  type Density,
  useDensityUrlState,
  type UseDensityUrlStateOptions,
  type UseDensityUrlStateResult,
} from "./url/useDensityUrlState";
export {
  type FeatureNotice,
  type FeatureNoticeKind,
  type TableChrome,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
} from "./useTableChrome";
export type { ChromeBodyData } from "./virtual/chromeBodyShared";
export { usePlainChromeBodyData } from "./virtual/usePlainChromeBodyData";
export { useVirtualChromeBodyData } from "./virtual/useVirtualChromeBodyData";
/* ── URL state ─────────────────────────────────────────────────────── */

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
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  type UrlStateAdapter,
} from "./url/adapter";
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
/* ── Selection ─────────────────────────────────────────────────────── */
export {
  columnDropProps,
  columnReorderKeyProps,
  columnRowDragProps,
  useColumnDragState,
} from "./columns/columnReorder";
export {
  type ColumnLayoutState,
  edgePinStyle,
  PIN_Z,
  pinnedCellStyle,
  type PinSide,
  type ReactUseColumnLayoutResult,
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
export { useHorizontalOverflow } from "./layout/useHorizontalOverflow";
export {
  type HeaderSelectionState,
  offersAllMatching,
  type SelectionState,
  useSelection,
  type UseSelectionOptions,
} from "./selection/useSelection";
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
  useTableVirtualization,
  type UseTableVirtualizationOptions,
} from "./virtual/useTableVirtualization";
/* ── Types a main-entry signature names ────────────────────────────── */

/**
 * Six shapes the front door's own signatures hand back.
 *
 * v3 moved the adapter contracts to `@adapttable/core/adapter`; the main entry
 * gives its returned shapes distinct public names because a return type a
 * caller cannot name is a signature they cannot write down.
 */
export type {
  EditableCellActivateProps as EditableCellActivateControlProps,
  EditableCellButtonProps as EditableCellConflictButtonProps,
  EditableCellSlots as EditableCellControls,
} from "./editing/EditableCellGate";
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
export type { RowReorderState as TableRowReorderState } from "./rows/rowReorder";
export {
  applyRowReorder,
  datasetIndex,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
  useRowReorder,
} from "./rows/rowReorder";
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
  type LazyChildrenState,
  useLazyChildren,
  type UseLazyChildrenOptions,
} from "./tree/useLazyChildren";
export {
  type TreeExpansionState,
  useTreeExpansion,
} from "./tree/useTreeExpansion";
/* ── Inline cell editing ───────────────────────────────────────────── */
export type { UseShortcutsOptions } from "./actions/useShortcuts";
export type {
  ColumnDragState,
  ColumnDropProps,
  ColumnReorderKeyProps,
  ColumnRowDragProps,
} from "./columns/columnReorder";
export type { ColumnDragRowAttrs } from "./columns/columnReorder";
export type {
  PinLeads,
  PinnedCellStyle,
  PinOffset,
} from "./columns/useColumnLayout";
export {
  type BatchEditingState,
  type BatchRowEdit,
  useBatchEditing,
  type UseBatchEditingOptions,
} from "./editing/batchEditing";
export {
  type DirtyCellState,
  useDirtyCells,
  type UseDirtyCellsOptions,
} from "./editing/dirtyCells";
export {
  type EditableCellController,
  editableCellController,
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
  asBatchGesture,
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
export type { EditValidationState, RowValidator } from "./editing/validation";
export type {
  CellValidator,
  ValidationCheckResult,
  ValidationTarget,
} from "./editing/validation";
export { SESSION_ATTR } from "./filters/headerFilterOverlay";
export {
  type GroupCollapseState,
  useGroupCollapse,
} from "./grouping/useGroupCollapse";
export {
  type GroupPagingState,
  useGroupPaging,
} from "./grouping/useGroupPaging";
export type { HorizontalOverflow } from "./layout/useHorizontalOverflow";
export type { Slot } from "./state/slots";
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
export type { SearchInputState } from "./useDataTable/useSearchInput";
export type { FilterTriggerToggle, TableBodyRegion } from "./useTableChrome";
export type { RowPairMeasurer } from "./virtual/measureRowPair";
export type { ColumnWindow } from "./virtual/useColumnWindow";
export type { TableErrorState } from "@adapttable/core";
