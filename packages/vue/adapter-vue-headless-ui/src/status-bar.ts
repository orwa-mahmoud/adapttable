import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import { statusBar as bindingStatusBar } from "@adapttable/vue/features";
import { h } from "vue";

import { HeadlessStatusBar } from "./navigation/StatusBar";

export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), [
    slotRender(STATUS_BAR, (props) => h(HeadlessStatusBar, props)),
  ]);
}
export { selectionStats } from "./selection-stats";
export type { SelectionStats } from "@adapttable/vue";
