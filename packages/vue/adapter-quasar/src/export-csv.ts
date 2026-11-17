import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportCsv as bindingExportCsv,
  type ExportCsvOptions,
} from "@adapttable/vue/features";

import { withQuasarExport } from "./export/withQuasarExport";

/** CSV export with native Quasar toolbar and progress controls. */
export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return withQuasarExport(bindingExportCsv<TRow>(options));
}
export type { ExportCsvOptions } from "@adapttable/vue/features";
