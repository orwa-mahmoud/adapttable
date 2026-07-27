/**
 * `@adapttable/antd` — the Ant Design adapter for AdaptTable.
 *
 * A batteries-included `<DataTable>` built on antd's high-level `<Table>`
 * plus the headless source builders re-exported from `@adapttable/core`.
 *
 * @packageDocumentation
 */

export {
  type SavedViewsLabels,
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
export { DataTable } from "./DataTable";
export type { DataTableProps, DataTableSlots } from "./types";

/* Re-exported headless engine — source builders, hooks, and types. */
export {
  type ActiveFilterChip,
  type BulkAction,
  type CellProps,
  type ColorScheme,
  type ColumnDef,
  type ColumnFilter,
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
