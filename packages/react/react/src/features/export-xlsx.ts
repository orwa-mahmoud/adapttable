/**
 * XLSX export — the export feature with core's XLSX writer.
 */
import type { ExportCsvOptions } from "@adapttable/core";
import { xlsxWriter } from "@adapttable/core/xlsx";

import { exportCsv } from "./export-csv";
import type { TableFeature } from "./tableFeature";

/**
 * Options for {@link exportXlsx}: the export's scope, columns and file name.
 *
 * @public
 */
export type ExportXlsxOptions<TRow> = Omit<ExportCsvOptions<TRow>, "writer">;

/**
 * Add XLSX export of the current view.
 *
 * @param options - `true`, `false`, or the export's scope, columns and file name.
 * @returns The feature.
 *
 * @public
 */
export function exportXlsx<TRow>(
  options: boolean | ExportXlsxOptions<TRow> = true
): TableFeature<TRow> {
  return exportCsv<TRow>(
    options === false
      ? false
      : { ...(options === true ? {} : options), writer: xlsxWriter() }
  );
}
