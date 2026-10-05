import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  cellNavigation as bindingCellNavigation,
  type CellNavigationOptions,
  COLUMN_SELECT,
  columnSelectionCheckbox as bindingColumnSelectionCheckbox,
  FILL_HANDLE_CONTROL,
} from "@adapttable/vue/cell-navigation";
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
export type {
  CellEdit,
  CellNavigationOptions,
  CellRange,
  GridCell,
} from "@adapttable/vue/cell-navigation";
