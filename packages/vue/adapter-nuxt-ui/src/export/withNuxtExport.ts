import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { nuxtExportSlots } from "../actions/nuxtExportSlots";

/** An export feature, drawn with Nuxt's own export controls. */
export function withNuxtExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: nuxtExportSlots(props.classNames),
      })
    ),
  ]);
}
