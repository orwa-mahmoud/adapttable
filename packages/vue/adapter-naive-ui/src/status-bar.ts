import { type StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import {
  selectionStats as bindingSelectionStats,
  statusBar as bindingStatusBar,
} from "@adapttable/vue/features";
import { h } from "vue";

import { NaiveStatusBar } from "./navigation/controls";
const renders = [slotRender(STATUS_BAR, (props) => h(NaiveStatusBar, props))];
export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), renders);
}
export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingSelectionStats(), renders);
}
