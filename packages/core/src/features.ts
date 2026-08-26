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
