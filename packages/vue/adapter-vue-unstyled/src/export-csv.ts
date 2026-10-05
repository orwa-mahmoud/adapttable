import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  EXPORT_CONTROL,
  ExportChrome,
  exportCsv as bindingExportCsv,
  type ExportCsvOptions,
} from "@adapttable/vue/export-csv";
import { h } from "vue";

import { nativeExportSlots } from "./actions/nativeControls";
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
) {
  return extendFeature(bindingExportCsv<TRow>(options), [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, { ...props, slots: nativeExportSlots(props.classNames) })
    ),
  ]);
}
export type * from "@adapttable/vue/export-csv";
