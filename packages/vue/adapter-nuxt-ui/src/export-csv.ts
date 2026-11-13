import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportCsv as bindingExport,
  type ExportCsvOptions,
} from "@adapttable/vue/features";

import { withNuxtExport } from "./export/withNuxtExport";

/** Export the current view as CSV through the binding's cancellable export model. */
export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return withNuxtExport(bindingExport<TRow>(options));
}
export type { ExportCsvOptions } from "@adapttable/vue/features";
