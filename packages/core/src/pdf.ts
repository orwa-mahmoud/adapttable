/**
 * PDF export and print layout — `@adapttable/core/pdf`.
 *
 * A separate entry point, so a table that exports CSV never downloads a
 * PDF writer. Import it and the export button writes `.pdf` instead; do
 * not, and none of this code reaches the bundle.
 *
 * Print is a different verb. `openPrintLayout` / `printTable` open the
 * browser dialog on the same view — column widths, groups, page breaks,
 * Unicode and RTL — because that is what the reader can actually see.
 *
 * ```tsx
 * import { pdfWriter, printTable } from "@adapttable/core/pdf";
 *
 * <DataTable exportCsv={{ writer: pdfWriter() }} … />
 * ```
 */
export type {
  ExportTable,
  ExportViewEntry,
  ExportWriter,
} from "./export/exportWriter";
export type { PdfWriterOptions } from "./export/pdf";
export { buildTablePdf, pdfWriter } from "./export/pdf";
export type {
  PrintLayoutOptions,
  PrintPageBreak,
  PrintPageSize,
} from "./export/printLayout";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  openPrintLayout,
  printStyles,
  printTable,
} from "./export/printLayout";
export type { ColumnDef } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "./editing/cellEditing";
export type {
  ExportPayload,
  ExportRowMeta,
  ExportWriteContext,
} from "./export/exportWriter";
export type { ColumnFilter } from "./filters/filterDefs";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  CellEditorOption,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type { ExportRowRole } from "./export/exportWriter";
export type { FilterDef, FilterType } from "./filters/filterDefs";
export type { ColumnHeaderController } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CustomCellEditorCtrl } from "./editing/cellEditing";
export type { FilterOptionsSource } from "./filters/filterDefs";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FilterOption } from "./filters/filterDefs";
