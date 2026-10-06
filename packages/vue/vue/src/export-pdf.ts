/** Optional PDF export; the writer stays outside the base and CSV entries. */
import { pdfWriter } from "@adapttable/core/pdf";

import { exportCsv, type ExportCsvOptions } from "./export-csv";
import type { StaticTableFeature, TableFeature } from "@adapttable/vue";

/** Export scope, columns, filename and host hooks, with the PDF writer fixed. @public */
export type ExportPdfOptions<TRow> = Omit<ExportCsvOptions<TRow>, "writer">;

/** Use the shared export controller to create a PDF document. @public */
export function exportPdf(options?: boolean): StaticTableFeature;
export function exportPdf<TRow>(
  options?: boolean | ExportPdfOptions<TRow>
): TableFeature<TRow>;
export function exportPdf<TRow>(
  options: boolean | ExportPdfOptions<TRow> = true
): TableFeature<TRow> {
  return exportCsv<TRow>(
    options === false
      ? false
      : { ...(options === true ? {} : options), writer: pdfWriter() }
  );
}
