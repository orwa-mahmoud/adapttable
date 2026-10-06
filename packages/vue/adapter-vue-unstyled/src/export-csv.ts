/**
 * Compatibility entry for native CSV export.
 *
 * @deprecated Import from `@adapttable/vue-unstyled/export`.
 * @packageDocumentation
 */
import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  exportCsv as bindingExportCsv,
  type ExportCsvOptions,
} from "@adapttable/vue/features";

import { withNativeExport } from "./actions/withNativeExport";

/** Export the current view as CSV with native toolbar and progress controls. @public */
export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return withNativeExport(bindingExportCsv<TRow>(options));
}
export type { ExportCsvOptions } from "@adapttable/vue/features";
