import { type StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender, STATUS_BAR } from "@adapttable/vue/adapter";
import {
  selectionStats as bindingSelectionStats,
  statusBar as bindingStatusBar,
} from "@adapttable/vue/features";
import { h } from "vue";

import { NativeStatusBar } from "./navigation/nativeNavigation";
const renders = [slotRender(STATUS_BAR, (props) => h(NativeStatusBar, props))];
export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), renders);
}
export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingSelectionStats(), renders);
}
