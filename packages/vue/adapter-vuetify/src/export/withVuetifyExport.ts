import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { vuetifyExportSlots } from "./controls";

/** An export feature, drawn with Vuetify's own export controls. */
export function withVuetifyExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: vuetifyExportSlots(props.classNames, props.dir),
      })
    ),
  ]);
}
