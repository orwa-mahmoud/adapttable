import { type TableFeature } from "@adapttable/vue";
import {
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { nativeContextMenuSlots } from "./actions/nativeControls";
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
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
export type { ContextMenuOptions } from "@adapttable/vue/features";
