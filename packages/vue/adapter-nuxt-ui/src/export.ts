import type { StaticTableFeature, TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  exportCsv as bindingExportCsv,
  type ExportCsvOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { nuxtExportSlots } from "./actions/nuxtExportSlots";

export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(bindingExportCsv<TRow>(options), [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, { ...props, slots: nuxtExportSlots(props.classNames) })
    ),
  ]);
}
export type { ExportCsvOptions } from "@adapttable/vue/features";
