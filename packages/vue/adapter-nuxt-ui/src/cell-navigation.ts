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
export function cellNavigation<TRow = unknown>(
  options: CellNavigationOptions<TRow> = {}
): StaticTableFeature {
  return extendFeature(bindingCellNavigation(options), [
    slotRender(FILL_HANDLE_CONTROL, (props) => h(NuxtFillHandle, props)),
  ]);
}
export type { CellEdit, GridCell } from "@adapttable/vue";
export type { CellRange } from "@adapttable/vue/adapter";
export type { CellNavigationOptions } from "@adapttable/vue/features";
