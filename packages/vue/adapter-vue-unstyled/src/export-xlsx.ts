import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportXlsx as bindingExportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/vue/xlsx";

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
export type { ExportXlsxOptions } from "@adapttable/vue/xlsx";
export { buildTableXlsx, xlsxWriter } from "@adapttable/vue/xlsx";
