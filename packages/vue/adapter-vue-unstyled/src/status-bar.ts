import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  selectionStats as bindingSelectionStats,
  STATUS_BAR,
  statusBar as bindingStatusBar,
} from "@adapttable/vue/status-bar";
import { h } from "vue";

import { NativeStatusBar } from "./navigation/nativeNavigation";
const renders = [slotRender(STATUS_BAR, (props) => h(NativeStatusBar, props))];
export function statusBar(): StaticTableFeature {
  return extendFeature(bindingStatusBar(), renders);
}
export function selectionStats(): StaticTableFeature {
  return extendFeature(bindingSelectionStats(), renders);
}
