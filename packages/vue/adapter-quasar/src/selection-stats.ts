import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import { selectionStats as bindingSelectionStats } from "@adapttable/vue/features";
import { h } from "vue";

import { QuasarStatusBar } from "./navigation/QuasarStatusBar";

export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingSelectionStats(), [
    slotRender(STATUS_BAR, (props) => h(QuasarStatusBar, { ...props })),
  ]);
}
export type { SelectionStats } from "@adapttable/vue";
