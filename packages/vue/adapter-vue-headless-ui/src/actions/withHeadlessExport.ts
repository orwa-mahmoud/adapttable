import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessExportControls } from "./exportControls";

export function withHeadlessExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: headlessExportControls(props.classNames),
      })
    ),
  ]);
}
