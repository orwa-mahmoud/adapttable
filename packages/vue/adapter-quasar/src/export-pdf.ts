import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportPdf as bindingExportPdf,
  type ExportPdfOptions,
} from "@adapttable/vue/pdf";

import { withQuasarExport } from "./export/withQuasarExport";

/** PDF export with the shared lifecycle and native Quasar controls. */
export function exportPdf(options?: boolean): StaticTableFeature;
export function exportPdf<TRow>(
  options?: boolean | ExportPdfOptions<TRow>
): TableFeature<TRow>;
export function exportPdf<TRow>(
  options: boolean | ExportPdfOptions<TRow> = true
): TableFeature<TRow> {
  return withQuasarExport(bindingExportPdf<TRow>(options));
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
