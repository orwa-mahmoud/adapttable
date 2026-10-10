import type { TableFeature } from "@adapttable/vue";
import {
  CONTEXT_MENU_CONTROL,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import NuxtContextMenu from "./actions/NuxtContextMenu";

export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(bindingContextMenu<TRow>(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) => h(NuxtContextMenu, props)),
  ]);
}
export type { ContextMenuOptions } from "@adapttable/vue/features";
