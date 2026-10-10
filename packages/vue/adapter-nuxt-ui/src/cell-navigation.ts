import { type StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FILL_HANDLE_CONTROL,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  cellNavigation as bindingCellNavigation,
  type CellNavigationOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { NuxtFillHandle } from "./navigation/nuxtNavigation";
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return extendFeature(bindingCellNavigation(options), [
    slotRender(FILL_HANDLE_CONTROL, (props) => h(NuxtFillHandle, props)),
  ]);
}
/** @deprecated Prefer the canonical @adapttable/nuxt-ui/column-selection entry. */
export { columnSelectionCheckbox } from "./column-selection";
export type { CellEdit, GridCell } from "@adapttable/vue";
export type { CellRange } from "@adapttable/vue/adapter";
export type { CellNavigationOptions } from "@adapttable/vue/features";
