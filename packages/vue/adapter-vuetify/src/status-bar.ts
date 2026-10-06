import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import {
  selectionStats as bindingSelectionStats,
  statusBar as bindingStatusBar,
} from "@adapttable/vue/features";
import { h } from "vue";

import { VuetifyStatusBar } from "./navigation/statusBar";

const fills = [slotRender(STATUS_BAR, (props) => h(VuetifyStatusBar, props))];

export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), fills);
}

export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingSelectionStats(), fills);
}
