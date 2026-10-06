import type { TableFeature } from "@adapttable/vue";
import {
  EXPORT_CONTROL,
  ExportChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { rekaExportControls } from "./exportControls";

export function withRekaExport<TRow>(
  feature: TableFeature<TRow>
): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(EXPORT_CONTROL, (props) =>
      h(ExportChrome, {
        ...props,
        slots: rekaExportControls(props.classNames),
      })
    ),
  ]);
}
