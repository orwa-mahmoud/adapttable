import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  CONTEXT_MENU_CONTROL,
  contextMenu as bindingContextMenu,
  ContextMenuChrome,
  type ContextMenuOptions,
} from "@adapttable/vue/context-menu";
import { h } from "vue";

import { nativeContextMenuSlots } from "./actions/nativeControls";
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
) {
  return extendFeature(bindingContextMenu<TRow>(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(ContextMenuChrome, {
        items: props.model.items,
        at: props.model.at,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.contextMenu,
        container: props.container,
        slots: nativeContextMenuSlots(props.classNames),
      })
    ),
  ]);
}
export type * from "@adapttable/vue/context-menu";
