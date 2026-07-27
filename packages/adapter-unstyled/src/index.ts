/**
 * `@adapttable/unstyled` — the headless, unstyled AdaptTable adapter.
 *
 * Renders semantic HTML with `data-adapttable-part` and `data-*` state
 * hooks plus per-part `className` overrides, so you can style it with
 * Tailwind, shadcn/ui, or your own CSS. Ships no styles of its own.
 *
 * @packageDocumentation
 */

export {
  AutoFilterForm,
  type AutoFilterFormProps,
} from "./components/AutoFilterForm";
export { FilterPanel, type FilterPanelProps } from "./components/FilterPanel";
export {
  FilterPopover,
  type FilterPopoverProps,
} from "./components/FilterPopover";
export { FiltersIcon, SearchIcon } from "./components/icons";
export {
  type SavedViewsLabels,
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
export { cx } from "./cx";
export { DataTable } from "./DataTable";
export type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "./types";

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
  FILTER_TYPES,
  type FilterDef,
  filterLabel,
  type FilterOption,
  filterStateKeys,
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
  useServerData,
  type UseServerDataOptions,
  useTableData,
  type UseTableDataOptions,
  type UseTableDataResult,
  useTableUrlState,
} from "@adapttable/core";

/* Router / custom-source integration types (re-exported from core). */
export {
  type ActionConfirm,
  type ColumnFilter,
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
