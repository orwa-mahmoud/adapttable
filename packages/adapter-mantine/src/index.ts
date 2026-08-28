/**
 * `@adapttable/mantine` — the Mantine adapter for AdaptTable.
 *
 * Exposes a batteries-included `<DataTable>` plus the headless source
 * builders re-exported from `@adapttable/core`, so a consumer can import
 * everything they need from one entry point.
 *
 * @packageDocumentation
 */

export { PivotPanel } from "./components/PivotPanel";
export { SavedViewsPanel } from "./components/SavedViewsPanel";
export { DataTable } from "./DataTable";
export type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "./types";

/* Styled sub-components (also overridable / reusable on their own). */
export {
  ActiveFilterChips,
  type ActiveFilterChipsProps,
} from "./components/ActiveFilterChips";
export {
  AutoFilterForm,
  type AutoFilterFormProps,
} from "./components/AutoFilterForm";
export {
  ChecklistFilter,
  type ChecklistFilterProps,
} from "./components/ChecklistFilter";
export { EmptyState, type EmptyStateProps } from "./components/EmptyState";
export { ErrorState, type ErrorStateProps } from "./components/ErrorState";
export { FillHandle } from "./components/FillHandle";
export {
  FilterDrawer,
  type FilterDrawerProps,
} from "./components/FilterDrawer";
export {
  FilterTreeBuilder,
  type FilterTreeBuilderProps,
} from "./components/FilterTreeBuilder";
export {
  BatchEditBar,
  type BatchEditBarProps,
  ColumnGroupToggle,
  type ColumnGroupToggleProps,
  FilterHeaderControl,
  type FilterHeaderControlProps,
  FilterHeaderRow,
  type FilterHeaderRowProps,
  FindBar,
  type FindBarProps,
  GroupMoreButton,
  type GroupMoreButtonProps,
  RowEditActions,
  type RowEditActionsProps,
  RowReorderButtons,
  type RowReorderButtonsProps,
  RowReorderHandle,
  type RowReorderHandleProps,
  TreeCell,
  type TreeCellProps,
  TreeToggle,
  type TreeToggleProps,
} from "./components/kitControls";
export {
  PaginationFooter,
  type PaginationFooterProps,
} from "./components/PaginationFooter";
export {
  type SavedViewsLabels,
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
export { SelectionStatsBar } from "./components/SelectionStatsBar";
export {
  TableSkeleton,
  type TableSkeletonProps,
} from "./components/TableSkeleton";

/* Animation helper. */
export {
  type MountStaggerOptions,
  useMountStagger,
} from "./animation/useMountStagger";

/* Re-exported headless engine — source builders, hooks, and types. */
export {
  type ActiveFilterChip,
  type BulkAction,
  type CellProps,
  type ColorScheme,
  type ColumnDef,
  type ColumnGroupDef,
  type ColumnGroupShow,
  type ColumnInput,
  type ConfirmHandler,
  type ConfirmRequest,
  createFilterRegistry,
  defaultConfirm,
  defaultFilterRegistry,
  defaultLabels,
  type Direction,
  type ExtraFilters,
  type FilterDef,
  type FilterOption,
  type FilterType,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  type FilterValue,
  type PaginatedResponse,
  type PaginationMode,
  resolveFilterRegistry,
  type RowAction,
  type SavedView,
  type SortByOption,
  type SortDirection,
  type TableLabels,
  type TableQuery,
  type TableQueryParams,
  type TableSource,
  useDataTable,
  type UseDataTableResult,
  useFrontendData,
  type UseFrontendDataOptions,
  useQuerySource,
  type UseQuerySourceOptions,
  useSavedViews,
  type UseSavedViewsOptions,
  type UseSavedViewsResult,
  useTableUrlState,
} from "@adapttable/core";

/* Router / custom-source integration types (re-exported from core). */
export {
  type ActionConfirm,
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  type InfiniteQueryLike,
  type PageSelector,
  type SortableValue,
  type UrlStateAdapter,
  type UseTableUrlStateOptions,
  type UseTableUrlStateResult,
} from "@adapttable/core";
export { deriveSortByOptions } from "@adapttable/core/adapter";

/* Completed public surface (v2): every type a consumer's own code
   needs — CSV options, column layout, cell editors, tier props —
   without ever depending on @adapttable/core directly. */
export {
  type BaseDataTableProps,
  type BulkActionContext,
  type CellEditor,
  type ChipLabelResolver,
  type ColumnFilter,
  type ColumnLayoutState,
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type EditConflict,
  type EditConflictChoice,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  type EditEvent,
  type EditEventHandler,
  type EditLifecycle,
  type EditUnit,
  type ExportCsvOptions,
  FILTER_TYPES,
  type UseServerDataOptions,
  type UseTableDataOptions,
} from "@adapttable/core";
export { type DataModeProps } from "@adapttable/core/adapter";
export type { DataTablePropsBase } from "./types";
