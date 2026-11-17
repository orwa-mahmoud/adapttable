/** Opt-in Angular feature factories and their options. @packageDocumentation */
import {
  exportPdf as exportPdfFeature,
  exportXlsx as exportXlsxFeature,
} from "./features/export";
export {
  cellNavigation,
  type CellNavigationOptions,
} from "./features/cellNavigation";
export { editHistory } from "./features/editHistory";
export {
  batchEditing,
  dirtyIndicators,
  editing,
  type EditingLifecycleExtras,
  rowEditing,
} from "./features/editing";
export {
  bulkActions,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  type CommandPaletteOptions,
  contextMenu,
  type ContextMenuOptions,
  extraRows,
  feature,
  fitColumns,
  headerFilters,
  multiSort,
  pinnedSummaryRows,
  print,
  resizableColumns,
  rowAppearance,
  type RowAppearanceOptions,
  savedViews,
  sidePanel,
  type SidePanelOptions,
  type SidePanelPanel,
  statusBar,
  undoRedoButtons,
} from "./features/factories";
export { filterTypes } from "./features/filters";
export { findInTable } from "./features/findInTable";
export { grouping, type GroupingExtras } from "./features/grouping";
export {
  groupingPanel,
  type GroupingPanelExtras,
} from "./features/groupingPanel";
export { nestedTable, rowDetail } from "./features/rowDetail";
export {
  rowPinning,
  type RowPinningFeatureOptions,
} from "./features/rowPinning";
export { rowReorder } from "./features/rowReorder";
export { selectionStats } from "./features/selectionStats";
export { tree, type TreeFeatureOptions } from "./features/tree";
export { virtualize, type VirtualizeOptions } from "./features/virtualize";
export { type SelectionStatsOptions } from "@adapttable/core";

// Types this entry's own signatures hand back, named from their owning entry.
export type {
  AdaptTableFeature,
  BatchEditHandler,
  CellEditHandler,
  DirtyEdits,
  EditHistoryHandle,
  EditHistoryOptions,
  FeatureMountContext,
  FeatureState,
  MaybeSignal,
  NestedTable,
  NestedTableContext,
  NestedTableFor,
  Renderer,
  RowDetailContext,
  RowEditHandler,
  SlotComponent,
} from "@adapttable/angular";

/**
 * PDF export of the current view.
 *
 * @deprecated Import `exportPdf` from `@adapttable/angular/pdf`.
 * @public
 */
export const exportPdf: typeof exportPdfFeature = exportPdfFeature;

/**
 * XLSX export of the current view.
 *
 * @deprecated Import `exportXlsx` from `@adapttable/angular/xlsx`.
 * @public
 */
export const exportXlsx: typeof exportXlsxFeature = exportXlsxFeature;
