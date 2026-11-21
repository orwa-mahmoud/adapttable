import type { AdaptTableFeature } from "@adapttable/angular";
import type { ExportCsvOptions } from "@adapttable/core";
import { xlsxWriter } from "@adapttable/core/xlsx";

import { exportWith } from "./exportWith";

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
