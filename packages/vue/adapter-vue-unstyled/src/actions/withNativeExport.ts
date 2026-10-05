import {
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/vue/adapter";
import { EXPORT_CONTROL, ExportChrome } from "@adapttable/vue/export-csv";
import { h } from "vue";

import { nativeExportSlots } from "./nativeControls";

/** All formats fill the same required control contract with the native kit. */
export function withNativeExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, { ...props, slots: nativeExportSlots(props.classNames) })
    ),
  ]);
}
