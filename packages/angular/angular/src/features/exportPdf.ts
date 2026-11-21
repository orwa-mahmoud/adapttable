import type { AdaptTableFeature } from "@adapttable/angular";
import type { ExportCsvOptions } from "@adapttable/core";
import { pdfWriter } from "@adapttable/core/pdf";

import { exportWith } from "./exportWith";

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
