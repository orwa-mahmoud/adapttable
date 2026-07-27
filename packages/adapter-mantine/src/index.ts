/**
 * `@adapttable/mantine` — the Mantine adapter for AdaptTable.
 *
 * Exposes a batteries-included `<DataTable>` plus the headless source
 * builders re-exported from `@adapttable/core`, so a consumer can import
 * everything they need from one entry point.
 *
 * @packageDocumentation
 */

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
export { EmptyState, type EmptyStateProps } from "./components/EmptyState";
export { ErrorState, type ErrorStateProps } from "./components/ErrorState";
export {
  PaginationFooter,
  type PaginationFooterProps,
} from "./components/PaginationFooter";
export {
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
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
  type ConfirmHandler,
  type ConfirmRequest,
  defaultConfirm,
  defaultLabels,
  type Direction,
  type ExtraFilters,
  type FilterDef,
  type FilterOption,
  type FilterType,
  type FilterValue,
  type PaginatedResponse,
  type PaginationMode,
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
  deriveSortByOptions,
  getHistoryAdapter,
  type InfiniteQueryLike,
  type PageSelector,
  type SortableValue,
  type UrlStateAdapter,
  type UseTableUrlStateOptions,
  type UseTableUrlStateResult,
} from "@adapttable/core";
