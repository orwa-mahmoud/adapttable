import {
  COLUMN_SELECT,
  extendFeature,
  FILL_HANDLE_CONTROL,
  slotRender,
} from "@adapttable/vue/adapter";
import { type StaticTableFeature } from "@adapttable/vue";
import {
  cellNavigation as bindingCellNavigation,
  type CellNavigationOptions,
  columnSelectionCheckbox as bindingColumnSelectionCheckbox,
} from "@adapttable/vue/features";
import { h } from "vue";

import {
  NativeColumnSelect,
  NativeFillHandle,
} from "./navigation/nativeNavigation";
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return extendFeature(bindingCellNavigation(options), [
    slotRender(FILL_HANDLE_CONTROL, (props) => h(NativeFillHandle, props)),
  ]);
}
export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(bindingColumnSelectionCheckbox(), [
    slotRender(COLUMN_SELECT, (props) => h(NativeColumnSelect, props)),
  ]);
}
export type { CellEdit, GridCell } from "@adapttable/vue";
export type { CellNavigationOptions } from "@adapttable/vue/features";
export type { CellRange } from "@adapttable/vue/adapter";
