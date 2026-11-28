import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { antdExportSlots } from "../actions/antdExportSlots";

/** An export feature, drawn with Ant Design Vue's own export controls. */
export function withAntdExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: antdExportSlots(props.classNames),
      })
    ),
  ]);
}
