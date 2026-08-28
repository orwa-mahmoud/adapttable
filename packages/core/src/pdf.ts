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
