/**
 * PDF export — the export feature with core's PDF writer.
 */
import { deferredPdfWriter, type ExportCsvOptions } from "@adapttable/core";

import { exportCsv } from "./export-csv";
import type { TableFeature } from "./tableFeature";

/**
 * Options for {@link exportPdf}: the export's scope, columns and file name.
 *
 * @public
 */
export type ExportPdfOptions<TRow> = Omit<ExportCsvOptions<TRow>, "writer">;

/**
 * Add PDF export of the current view.
 *
 * @param options - `true`, `false`, or the export's scope, columns and file name.
 * @returns The feature.
 *
 * @public
 */
export function exportPdf<TRow>(
  options: boolean | ExportPdfOptions<TRow> = true
): TableFeature<TRow> {
  return exportCsv<TRow>(
    options === false
      ? false
      : { ...(options === true ? {} : options), writer: deferredPdfWriter() }
  );
}
