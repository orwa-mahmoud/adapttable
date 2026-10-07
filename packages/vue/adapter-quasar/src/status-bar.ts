import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import { statusBar as bindingStatusBar } from "@adapttable/vue/features";
import { h } from "vue";

import { QuasarStatusBar } from "./navigation/QuasarStatusBar";

export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), [
    slotRender(STATUS_BAR, (props) => h(QuasarStatusBar, { ...props })),
  ]);
}
export { selectionStats } from "./selection-stats";
export type { SelectionStats } from "@adapttable/vue";
