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
 * Kit subpaths re-export the same factories. There is no bundle saving yet:
 * while the enabling props still work, DataTable keeps its internal imports.
 * The drop lands at v3.
 *
 * @packageDocumentation
 */
export type { Command } from "./actions/commandRegistry";
export type {
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export type { Aggregator } from "./aggregate/aggregate";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuRow,
} from "./columns/columnMenuModel";
export type { BatchRowEdit } from "./editing/batchEditing";
export type { CustomCellEditorRender } from "./editing/cellEditing";
export type { ExportWriter } from "./export/exportWriter";
export type { ExportCsvOptions } from "./export/tableCsv";
export {
  batchEditing,
  bulkActions,
  cellNavigation,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  contextMenu,
  densityChooser,
  dirtyIndicators,
  editHistory,
  editing,
  exportCsv,
  extraRows,
  feature,
  filters,
  filterTypes,
  findInTable,
  fitColumns,
  fullscreen,
  grouping,
  headerFilters,
  multiSort,
  nestedTable,
  print,
  resizableColumns,
  rowAppearance,
  rowDetail,
  rowEditing,
  rowPinning,
  rowReorder,
  savedViews,
  selectionStats,
  sidePanel,
  statusBar,
  tree,
  undoRedoButtons,
  virtualize,
} from "./features/factories";
export { useTableFeatures } from "./features/featureHost";
export type {
  FeatureApplyInput,
  FeaturePatch,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
export { applyTableFeatures } from "./features/tableFeature";
export type { FilterDef } from "./filters/filterDefs";
export type { FilterTypeSpec } from "./filters/filterRegistry";
export type { GroupSort } from "./grouping/groupRows";
export type { SidePanelEntry } from "./layout/SidePanelChrome";
export type { SidePanelOptions } from "./props";
export type { CellSpanAppearance, GetCellSpan } from "./rows/cellSpan";
export type { ExtraRow } from "./rows/extraRows";
export type { RowPinState } from "./rows/rowPinning";
export type { RowReorderHandler } from "./rows/rowReorder";
export type { RowHeight, RowStyle } from "./rows/rowStyle";
export type { NestedTableFor } from "./tree/nestedTable";
export type { BulkAction } from "./types";
export type { UseSavedViewsOptions } from "./url/useSavedViews";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { Shortcut } from "./actions/useShortcuts";
export type { ColumnMenuLabels, PinnedSide } from "./columns/columnMenuModel";
export type { UseColumnLayoutResult } from "./columns/useColumnLayout";
export type { LayoutStorage } from "./columns/useColumnLayoutStorageState";
export type { CustomCellEditorCtrl } from "./editing/cellEditing";
export type { ExportPayload, ExportWriteContext } from "./export/exportWriter";
export type {
  ExportColumnScope,
  ExportInfo,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "./export/tableCsv";
export type { FeatureHostState } from "./features/currentHost";
export type { FilterOptionsSource } from "./filters/filterDefs";
export type {
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type { ChipLabelResolver } from "./filters/useActiveFilterChips";
export type { GroupNode } from "./grouping/groupRows";
export type { CellSpanRequest, GetCellSpanArgs } from "./rows/cellSpan";
export type { ExtraRowKind } from "./rows/extraRows";
export type { QueryCondition } from "./source/queryContract";
export type { NestedTable } from "./tree/nestedTable";
export type {
  ActionConfirm,
  BulkActionContext,
  ColumnDef,
  ExtraFilters,
  SortableValue,
} from "./types";
export type { UrlStateAdapter } from "./url/adapter";
export type {
  SavedViewMigration,
  SavedViewsStore,
  SavedViewVisibility,
} from "./url/useSavedViews";

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
export type { CellEditor } from "./editing/cellEditing";
export type { ExportTable } from "./export/exportWriter";
export type { ExportQuery } from "./export/tableCsv";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "./features/currentHost";
export type {
  ColumnFilter,
  FilterOption,
  FilterType,
} from "./filters/filterDefs";
export type { FilterFormSource } from "./filters/filterForm";
export type { NestedTableDefaults } from "./tree/nestedTable";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  FilterValue,
  TableLabels,
} from "./types";
export type { SavedView } from "./url/useSavedViews";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditorOption } from "./editing/cellEditing";
export type { ExportRowMeta } from "./export/exportWriter";
export type { TableSource } from "./source/TableSource";
export type { ColumnHeaderController, SortDirection } from "./types";
export type { Density } from "./url/useDensityUrlState";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ExportRowRole } from "./export/exportWriter";
export type { FacetMap } from "./filters/facets";
export type { QueryFilterGroup } from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableStateMutators } from "./tableStateMutators";
export type { ResolvedPaginationMode } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FacetCounts } from "./filters/facets";
export type { SortLevel } from "./sort/compare";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ChecklistValue } from "./filters/checklist";
