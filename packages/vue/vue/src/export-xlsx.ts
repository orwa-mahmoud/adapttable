/** Optional XLSX export; the writer stays outside the base and CSV entries. */
import { xlsxWriter } from "@adapttable/core/xlsx";

import { exportCsv, type ExportCsvOptions } from "./export-csv";
import type { StaticTableFeature, TableFeature } from "@adapttable/vue";

/** Export scope, columns, filename and host hooks, with the XLSX writer fixed. @public */
export type ExportXlsxOptions<TRow> = Omit<ExportCsvOptions<TRow>, "writer">;

/** Use the shared export controller to create a XLSX document. @public */
export function exportXlsx(options?: boolean): StaticTableFeature;
export function exportXlsx<TRow>(
  options?: boolean | ExportXlsxOptions<TRow>
): TableFeature<TRow>;
export function exportXlsx<TRow>(
  options: boolean | ExportXlsxOptions<TRow> = true
): TableFeature<TRow> {
  return exportCsv<TRow>(
    options === false
      ? false
      : { ...(options === true ? {} : options), writer: xlsxWriter() }
  );
}
