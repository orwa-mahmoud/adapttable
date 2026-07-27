/**
 * `@adapttable/base-ui` — the Base UI adapter for AdaptTable.
 *
 * A batteries-included `<DataTable>` built on Base UI components plus the
 * headless source builders re-exported from `@adapttable/core`.
 *
 * @packageDocumentation
 */

import { ensureBaseUiStyles } from "./injectStyles";

ensureBaseUiStyles();

export {
  type SavedViewsLabels,
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
export { DataTable } from "./DataTable";
export type {
  BaseUiAccentColor,
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
  type ColumnFilter,
  type ConfirmHandler,
  type ConfirmRequest,
  defaultConfirm,
  defaultLabels,
  type Direction,
  type ExtraFilters,
  FILTER_TYPES,
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
  useServerData,
  type UseServerDataOptions,
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
  type ColumnLayoutState,
  type ExportCsvOptions,
  type UseTableDataOptions,
} from "@adapttable/core";
export { type DataModeProps } from "@adapttable/core/adapter";
