/** Opt-in pdf integration. */
export type { ExportPdfOptions } from "./export-pdf";
export { exportPdf } from "./export-pdf";
export type {
  PdfWriterOptions,
  PrintLayoutOptions,
  PrintPageBreak,
  PrintPageSize,
} from "@adapttable/core/pdf";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  buildTablePdf,
  openPrintLayout,
  pdfWriter,
  printStyles,
  printTable,
} from "@adapttable/core/pdf";

// Types this entry's own signatures hand back.
export type { SummaryRowFn } from "./aggregate/aggregate";
export type { Attrs } from "./attrs";
export type {
  CellContext,
  ColumnDef,
  ColumnGroup,
  ColumnInput,
  ComponentRenderer,
  FooterContext,
  HeaderContext,
  Renderer,
  RenderFunction,
} from "./columnDef";
export type { ColumnLayout, ColumnLayoutOptions } from "./columns/columnLayout";
export type { DirtyEdits, TableEditingOptions } from "./editing/editingModels";
export type {
  ComposedFeature,
  FeatureMountContext,
  StaticFeatureHost,
  StaticTableFeature,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
export type { FeatureState } from "./featureState";
export type {
  GroupRowModel,
  RowDetailModel,
  TableGrouping,
  TableRowDetail,
  TableTree,
  TreeCellModel,
} from "./hierarchy/models";
export type { TableRowInventory } from "./hierarchy/rowInventory";
export type {
  RowActionControl,
  RowActionControlsInput,
  RowActionControlsProjector,
  TableBodyProjection,
  TableBodyProjectionInput,
  TableBodyProjector,
} from "./layout/modelChannels";
export type {
  DesktopTableModel,
  MobileCardsModel,
  TableBodySlot,
  TableCellModel,
  TableHeaderModel,
  TableRowModel,
} from "./layout/tableModels";
export type {
  TableSummaryCellModel,
  TableSummaryModel,
} from "./layout/tableSummaryModel";
export type { SelectionCheckboxAttrs } from "./selection/checkboxControl";
export type { RowSelection } from "./selection/selection";
export type { SourceViewportOptions } from "./source/sourceLifecycle";
export type { UseFrontendDataOptions } from "./source/useFrontendData";
export type { MaybeRefOrGetterOptional } from "./store";
export type { UseTableUrlStateOptions } from "./url/useTableUrlState";
export type {
  useDataTable,
  UseDataTableOptions,
  UseDataTableResult,
} from "./useDataTable";
export type {
  ResolvedTableOptions,
  UseDataTableShellOptions,
} from "./useDataTableShell";
