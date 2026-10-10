import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportXlsx as bindingExportXlsx,
  type ExportXlsxOptions,
} from "@adapttable/vue/xlsx";

import { withQuasarExport } from "./export/withQuasarExport";

/** XLSX export with the shared lifecycle and native Quasar controls. */
export function exportXlsx(options?: boolean): StaticTableFeature;
export function exportXlsx<TRow>(
  options?: boolean | ExportXlsxOptions<TRow>
): TableFeature<TRow>;
export function exportXlsx<TRow>(
  options: boolean | ExportXlsxOptions<TRow> = true
): TableFeature<TRow> {
  return withQuasarExport(bindingExportXlsx<TRow>(options));
}
export type { ExportXlsxOptions } from "@adapttable/vue/xlsx";
export { buildTableXlsx, xlsxWriter } from "@adapttable/vue/xlsx";
