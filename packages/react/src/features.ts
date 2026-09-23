/**
 * Feature composition — `@adapttable/core/features`.
 *
 * A separate entry so a table that never composes features never downloads
 * the factories. The `features` prop and {@link applyTableFeatures} live
 * next to `<DataTable>`; these named factories are what a host imports:
 *
 * ```tsx
 * import { rowReorder } from "@adapttable/mantine/row-reorder";
 *
 * <DataTable features={[rowReorder(onRowReorder)]} … />
 * ```
 *
 * Kit subpaths pair the same factories with their adapter contributions. The
 * import is the switch: an omitted feature stays outside the root table graph.
 *
 * @packageDocumentation
 */
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export type { BatchRowEdit } from "./editing/batchEditing";
export type { RowEditIcons } from "./editing/RowEditGate";
export { cellNavigation } from "./features/cell-navigation";
export { densityChooser } from "./features/density";
export { editHistory } from "./features/edit-history";
export {
  batchEditing,
  dirtyIndicators,
  editing,
  rowEditing,
} from "./features/editing";
export { exportCsv } from "./features/export-csv";
export {
  bulkActions,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  contextMenu,
  extraRows,
  feature,
  filterTypes,
  fitColumns,
  headerFilters,
  multiSort,
  pinnedSummaryRows,
  print,
  resizableColumns,
  rowAppearance,
  savedViews,
  sidePanel,
  statusBar,
  undoRedoButtons,
} from "./features/factories";
export type { RowOf } from "./features/featureHost";
export { useTableFeatures } from "./features/featureHost";
export { filters } from "./features/filters";
export { findInTable } from "./features/find-in-table";
export { fullscreen } from "./features/fullscreen";
export type { GroupingExtras, StaticGroupingExtras } from "./features/grouping";
export { grouping } from "./features/grouping";
export { groupingPanel } from "./features/grouping-panel";
export type {
  FeatureProviderContribution,
  FeatureProviderProps,
  FeatureRender,
  FeatureSlotKey,
} from "./features/providers";
export { rowActions } from "./features/row-actions";
export { nestedTable, rowDetail } from "./features/row-detail";
export { rowPinning } from "./features/row-pinning";
export { rowReorder } from "./features/row-reorder";
export { selectionStats } from "./features/selection-stats";
export type {
  FeatureApplyInput,
  FeaturePatch,
  StaticFeatureHost,
  StaticTableFeature,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
export { applyTableFeatures } from "./features/tableFeature";
export { tree } from "./features/tree";
export { virtualize, type VirtualizeOptions } from "./features/virtualize";
export type { SidePanelEntry } from "./layout/SidePanelChrome";
export type { FeatureProps } from "./props";
export type { SidePanelOptions } from "./props";
export type { RowMutationHandlers } from "./rows/rowMutations";
export type { RowPinState } from "./rows/rowPinning";
export type { RowReorderHandler } from "./rows/rowReorder";
export type { NestedTableFor } from "./tree/nestedTable";
export type { UseSavedViewsOptions } from "./url/useSavedViews";
export type { Command } from "@adapttable/core";
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/core";
export type { AggregateName, Aggregator } from "@adapttable/core";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuItem,
  ColumnMenuRow,
} from "@adapttable/core";
export type { CustomCellEditorRender } from "@adapttable/core";
export type { ExportWriter } from "@adapttable/core";
export type {
  ExportAllControls,
  ExportAllQuery,
  ExportAllResult,
  ExportCsvOptions,
} from "@adapttable/core";
export type { FilterDef } from "@adapttable/core";
export type { FilterTypeSpec } from "@adapttable/core";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "@adapttable/core";
export type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDragSource,
  GroupingDragState,
  GroupingDropProps,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "@adapttable/core";
export type { GroupSort } from "@adapttable/core";
export type { RowGroupLevel, RowGroupRef } from "@adapttable/core";
export type { CellSpanAppearance, GetCellSpan } from "@adapttable/core";
export type { ExtraRow } from "@adapttable/core";
export type { PinnedRows } from "@adapttable/core";
export type {
  RowGroupMoveHandler,
  RowMoveConfirmHandler,
  RowMoveMenuModel,
  RowMovePolicy,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderOptions,
  RowTreeMoveHandler,
  RowTreeParentRef,
} from "@adapttable/core";
export type { RowHeight, RowStyle } from "@adapttable/core";
export type { RowAction } from "@adapttable/core";
export type { BulkAction } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { Shortcut } from "./actions/useShortcuts";
export type { ColumnDef } from "./columnDef";
export type { UseColumnLayoutResult } from "./columns/useColumnLayout";
export type { LayoutStorage } from "./columns/useColumnLayoutStorageState";
export type { ChipLabelResolver } from "./filters/useActiveFilterChips";
export type { NestedTable } from "./tree/nestedTable";
export type { UrlStateAdapter } from "./url/adapter";
export type {
  SavedViewMigration,
  SavedViewsStore,
  SavedViewVisibility,
} from "./url/useSavedViews";
export type { ColumnMenuLabels, PinnedSide } from "@adapttable/core";
export type { CustomCellEditorCtrl } from "@adapttable/core";
export type { ExportPayload, ExportWriteContext } from "@adapttable/core";
export type {
  ExportColumnScope,
  ExportInfo,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "@adapttable/core";
export type { FeatureHostState } from "@adapttable/core";
export type { FilterOptionsSource } from "@adapttable/core";
export type {
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "@adapttable/core";
export type { GroupNode } from "@adapttable/core";
export type { CellSpanRequest, GetCellSpanArgs } from "@adapttable/core";
export type { ExtraRowKind } from "@adapttable/core";
export type { QueryCondition } from "@adapttable/core";
export type {
  ActionConfirm,
  BulkActionContext,
  ExtraFilters,
  SortableValue,
} from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  ColumnLayoutState,
  PinOffset,
  PinSide,
} from "./columns/useColumnLayout";
export type { FilterFormSource } from "./filters/filterForm";
export type { NestedTableDefaults } from "./tree/nestedTable";
export type { SavedView } from "./url/useSavedViews";
export type { CellEditor } from "@adapttable/core";
export type { ExportTable } from "@adapttable/core";
export type { ExportQuery } from "@adapttable/core";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "@adapttable/core";
export type { ColumnFilter, FilterOption, FilterType } from "@adapttable/core";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  FilterValue,
  TableLabels,
} from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { Density } from "./url/useDensityUrlState";
export type { CellEditorOption } from "@adapttable/core";
export type { ExportRowMeta } from "@adapttable/core";
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "@adapttable/core";
export type { TableSource } from "@adapttable/core";
export type { ColumnHeaderController, SortDirection } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ExportRowRole } from "@adapttable/core";
export type { FacetMap } from "@adapttable/core";
export type { QueryFilterGroup } from "@adapttable/core";
export type { QueryGroupRow } from "@adapttable/core";
export type { TableStateMutators } from "@adapttable/core";
export type { ResolvedPaginationMode } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FacetCounts } from "@adapttable/core";
export type { SortLevel } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ChecklistValue } from "./filters/checklist";
