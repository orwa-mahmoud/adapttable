import type { AdaptTableFeature } from "@adapttable/angular";
import { type ExportCsvOptions, type ExportWriter } from "@adapttable/core";
import { coreExportCsv } from "@adapttable/core/binding";
import { pdfWriter } from "@adapttable/core/pdf";
import { xlsxWriter } from "@adapttable/core/xlsx";

/** Options that name `writer`, or the writer alone when the host passed `true`. */
function writerOptions<TRow>(
  options: true | Omit<ExportCsvOptions<TRow>, "writer">,
  writer: ExportWriter
): ExportCsvOptions<TRow> {
  if (options === true) return { writer };
  return { ...options, writer };
}

/** A feature that writes with `writer`, or no export when `options` is false. */
function exportWith<TRow>(
  options: boolean | Omit<ExportCsvOptions<TRow>, "writer">,
  writer: ExportWriter
): AdaptTableFeature {
  if (options === false) return coreExportCsv(false);
  return coreExportCsv(writerOptions(options, writer));
}

/**
 * XLSX export of the current view, through `@adapttable/core/xlsx`.
 *
 * @param options - `true`, `false`, or the export's scope, columns and filename.
 * @returns The feature.
 *
 * @public
 */
export function exportXlsx<TRow>(
  options: boolean | Omit<ExportCsvOptions<TRow>, "writer"> = true
): AdaptTableFeature {
  return exportWith(options, xlsxWriter());
}

/**
 * PDF export of the current view, through `@adapttable/core/pdf`.
 *
 * @param options - `true`, `false`, or the export's scope, columns and filename.
 * @returns The feature.
 *
 * @public
 */
export function exportPdf<TRow>(
  options: boolean | Omit<ExportCsvOptions<TRow>, "writer"> = true
): AdaptTableFeature {
  return exportWith(options, pdfWriter());
}
