/**
 * `@adapttable/antd` — the Ant Design adapter for AdaptTable.
 *
 * A batteries-included `<DataTable>` built on antd's high-level `<Table>`
 * plus the headless source builders re-exported from `@adapttable/core`.
 *
 * @packageDocumentation
 */

export { agentApproval } from "./agent-approval";
export {
  ChecklistFilter,
  type ChecklistFilterProps,
} from "./components/ChecklistFilter";
export { FillHandle } from "./components/FillHandle";
export {
  FilterTreeBuilder,
  type FilterTreeBuilderProps,
} from "./components/FilterTreeBuilder";
export { GroupingPanel } from "./components/GroupingPanel";
export {
  AgentApproval,
  type AgentApprovalProps,
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
export { DataTable } from "./DataTable";
export type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "./types";

/* Re-exported headless engine — source builders, hooks, and types. */
export {
  type BulkAction,
  type ColorScheme,
  type ColumnFilter,
  type ColumnGroupDef,
  type ColumnGroupShow,
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
  type MobileCardRenderer,
  type PaginatedResponse,
  type PaginationMode,
  resolveFilterRegistry,
  type RowAction,
  type RowActionsRenderer,
  type SortByOption,
  type SortDirection,
  type TableLabels,
  type TableQuery,
  type TableSource,
} from "@adapttable/core";
export type { CellProps, ColumnDef, ColumnInput } from "@adapttable/react";
export {
  type ActiveFilterChip,
  type SavedView,
  type ToolbarSlots,
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
  type UseTableUrlStateOptions,
  type UseTableUrlStateResult,
} from "@adapttable/react";

/* Router / custom-source integration types. */
export { type ActionConfirm, type SortableValue } from "@adapttable/core";
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  type InfiniteQueryLike,
  type PageSelector,
  type UrlStateAdapter,
} from "@adapttable/react";
export { deriveSortByOptions } from "@adapttable/react/adapter";

/* The adapter's own names: the props base every DataTableProps is built
   from, before the data mode is chosen. */
export type { DataTablePropsBase } from "./types";

/* Completed public surface (v2): every type a consumer's own code
   needs — CSV options, column layout, cell editors, tier props —
   without ever depending on @adapttable/core directly. */
export {
  type BulkActionContext,
  type CellEditor,
  type ChipLabelResolver,
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type ExportCsvOptions,
  FILTER_TYPES,
} from "@adapttable/core";
export {
  type BaseDataTableProps,
  type ColumnLayoutState,
  type EditConflict,
  type EditConflictChoice,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  type EditEvent,
  type EditEventHandler,
  type EditLifecycle,
  type EditUnit,
  type UseServerDataOptions,
  type UseTableDataOptions,
} from "@adapttable/react";
export { type DataModeProps } from "@adapttable/react/adapter";
