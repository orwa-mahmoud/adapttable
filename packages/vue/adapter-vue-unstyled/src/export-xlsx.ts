import type { StaticTableFeature, TableFeature } from "@adapttable/vue/adapter";
import {
  exportXlsx as bindingExportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/vue/export-xlsx";

import { withNativeExport } from "./actions/withNativeExport";

/** Export the current view as XLSX with native toolbar and progress controls. @public */
export function exportXlsx(options?: boolean): StaticTableFeature;
export function exportXlsx<TRow>(
  options?: boolean | ExportXlsxOptions<TRow>
): TableFeature<TRow>;
export function exportXlsx<TRow>(
  options: boolean | ExportXlsxOptions<TRow> = true
): TableFeature<TRow> {
  return withNativeExport(bindingExportXlsx<TRow>(options));
}
export type * from "@adapttable/vue/export-xlsx";
export type { ExportXlsxOptions } from "@adapttable/vue/export-xlsx";
export { buildTableXlsx, xlsxWriter } from "@adapttable/vue/export-xlsx";
