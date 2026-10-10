import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportPdf as bindingExport,
  type ExportPdfOptions,
} from "@adapttable/vue/pdf";

import { withShadcnExport } from "./actions/withShadcnExport";

export function exportPdf(options?: boolean): StaticTableFeature;
export function exportPdf<TRow>(
  options?: boolean | ExportPdfOptions<TRow>
): TableFeature<TRow>;
export function exportPdf<TRow>(
  options: boolean | ExportPdfOptions<TRow> = true
): TableFeature<TRow> {
  return withShadcnExport(bindingExport<TRow>(options));
}
export type { ExportPdfOptions } from "@adapttable/vue/pdf";
export type {
  PdfWriterOptions,
  PrintLayoutOptions,
  PrintPageBreak,
  PrintPageSize,
} from "@adapttable/vue/pdf";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  buildTablePdf,
  openPrintLayout,
  pdfWriter,
  printStyles,
  printTable,
} from "@adapttable/vue/pdf";
