import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import { selectionStats as bindingStats } from "@adapttable/vue/features";
import { h } from "vue";

import { HeadlessStatusBar } from "./navigation/StatusBar";

export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingStats(), [
    slotRender(STATUS_BAR, (props) => h(HeadlessStatusBar, props)),
  ]);
}
export type { SelectionStats } from "@adapttable/vue";
