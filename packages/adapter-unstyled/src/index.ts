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
export {
  ChecklistFilter,
  type ChecklistFilterProps,
} from "./components/ChecklistFilter";
export { FillHandle } from "./components/FillHandle";
export { FilterPanel, type FilterPanelProps } from "./components/FilterPanel";
export {
  FilterPopover,
  type FilterPopoverProps,
} from "./components/FilterPopover";
export {
  FilterTreeBuilder,
  type FilterTreeBuilderProps,
} from "./components/FilterTreeBuilder";
export { FiltersIcon, SearchIcon } from "./components/icons";
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
export { PivotPanel } from "./components/PivotPanel";
export {
  type SavedViewsLabels,
  SavedViewsMenu,
  type SavedViewsMenuProps,
} from "./components/SavedViewsMenu";
export { SavedViewsPanel } from "./components/SavedViewsPanel";
export { SelectionStatsBar } from "./components/SelectionStatsBar";
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
  FILTER_TYPES,
  type FilterDef,
  filterLabel,
  type FilterOption,
  filterStateKeys,
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
  getHistoryAdapter,
  type InfiniteQueryLike,
  type PageSelector,
  type SortableValue,
  type UrlStateAdapter,
  type UseTableUrlStateOptions,
  type UseTableUrlStateResult,
} from "@adapttable/core";
export { deriveSortByOptions } from "@adapttable/core/adapter";

/* The adapter's own names: the props base every DataTableProps is built
   from, before the data mode is chosen, and the props its icons take. */
export type { IconProps } from "./components/icons";
export type { DataTablePropsBase } from "./types";

/* Completed public surface (v2): every type a consumer's own code
   needs — CSV options, column layout, cell editors, tier props —
   without ever depending on @adapttable/core directly. */
export {
  type BaseDataTableProps,
  type BulkActionContext,
  type CellEditor,
  type ChipLabelResolver,
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
} from "@adapttable/core";
export { type DataModeProps } from "@adapttable/core/adapter";
