import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportPdf as bindingExportPdf,
  type ExportPdfOptions,
} from "@adapttable/vue/pdf";

import { withNativeExport } from "./actions/withNativeExport";

/** Export the current view as PDF with native toolbar and progress controls. @public */
export function exportPdf(options?: boolean): StaticTableFeature;
export function exportPdf<TRow>(
  options?: boolean | ExportPdfOptions<TRow>
): TableFeature<TRow>;
export function exportPdf<TRow>(
  options: boolean | ExportPdfOptions<TRow> = true
): TableFeature<TRow> {
  return withNativeExport(bindingExportPdf<TRow>(options));
}
export type { ExportPdfOptions } from "@adapttable/vue/pdf";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  buildTablePdf,
  openPrintLayout,
  pdfWriter,
  printStyles,
  printTable,
} from "@adapttable/vue/pdf";
