import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { elementExportSlots } from "../actions/elementExportSlots";

/** An export feature, drawn with Element's own export controls. */
export function withElementExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: elementExportSlots(props.classNames),
      })
    ),
  ]);
}
