import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportCsv as bindingExport,
  type ExportCsvOptions,
} from "@adapttable/vue/features";

import { withHeadlessExport } from "./actions/withHeadlessExport";

export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return withHeadlessExport(bindingExport<TRow>(options));
}
export type { ExportCsvOptions } from "@adapttable/vue/features";
