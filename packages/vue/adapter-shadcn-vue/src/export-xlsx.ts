import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportXlsx as bindingExport,
  type ExportXlsxOptions,
} from "@adapttable/vue/xlsx";

import { withShadcnExport } from "./actions/withShadcnExport";

export function exportXlsx(options?: boolean): StaticTableFeature;
export function exportXlsx<TRow>(
  options?: boolean | ExportXlsxOptions<TRow>
): TableFeature<TRow>;
export function exportXlsx<TRow>(
  options: boolean | ExportXlsxOptions<TRow> = true
): TableFeature<TRow> {
  return withShadcnExport(bindingExport<TRow>(options));
}
export type { ExportXlsxOptions } from "@adapttable/vue/xlsx";
export { buildTableXlsx, xlsxWriter } from "@adapttable/vue/xlsx";
