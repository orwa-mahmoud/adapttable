/** Opt-in feature factories and their configuration options. */
export type {
  CommandPaletteOptions,
  SidePanelOptions,
  SidePanelPanel,
} from "./actions/contracts";
export { bulkActions } from "./bulk-actions";
export { commandPalette } from "./command-palette";
export type { ContextMenuOptions } from "./context-menu";
export { contextMenu } from "./context-menu";
export type { EditingLifecycleExtras } from "./editing";
export {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "./editing";
export { exportCsv } from "./export-csv";
export { columnMenu } from "./features/columnMenu";
export { densityChooser } from "./features/density";
export { fullscreen } from "./features/fullscreen";
export type { GroupingExtras, StaticGroupingExtras } from "./features/grouping";
export { grouping } from "./features/grouping";
export type { RowAppearanceOptions } from "./features/headlessFactories";
export {
  cellSpan,
  collapsibleColumnGroups,
  extraRows,
  fitColumns,
  multiSort,
  pinnedSummaryRows,
  resizableColumns,
  rowAppearance,
} from "./features/headlessFactories";
export { rowActions } from "./features/rowActions";
export { nestedTable, rowDetail } from "./features/rowDetail";
export type { RowPinningFeatureOptions } from "./features/rowPinning";
export { rowPinning } from "./features/rowPinning";
export { savedViews } from "./features/savedViews";
export { feature } from "./features/tableFeature";
export type { TreeFeatureOptions } from "./features/tree";
export { tree } from "./features/tree";
export type { FiltersOptions } from "./filters";
export { filters, filterTypes } from "./filters";
export { headerFilters } from "./header-filters";
export type { CellNavigationOptions } from "./navigation/contracts";
export {
  cellNavigation,
  columnSelectionCheckbox,
  findInTable,
  selectionStats,
  statusBar,
} from "./navigation/features";
export { print } from "./print";
export { sidePanel } from "./side-panel";
export { groupingPanel } from "./specialized/groupingPanel";
export { rowReorder } from "./specialized/rowReorder";
export type { VirtualizeOptions } from "./specialized/virtualize";
export { virtualize } from "./specialized/virtualize";
export type { ExportCsvOptions, SelectionStatsOptions } from "@adapttable/core";
