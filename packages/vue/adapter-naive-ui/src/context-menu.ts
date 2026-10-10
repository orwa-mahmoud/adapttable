import type { TableFeature } from "@adapttable/vue";
import {
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  type ContextMenuSlots,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/vue/features";
import { NDivider } from "naive-ui";
import { h } from "vue";

import { NaiveContextMenuSurface } from "./actions/NaiveContextMenuSurface";
import { naiveButton } from "./controls/button";
function contextSlots(
  names: Readonly<Record<string, string | undefined>> = {}
): ContextMenuSlots {
  return {
    Surface: (props) => h(NaiveContextMenuSurface, props),
    Item: ({ item, onSelect }) =>
      naiveButton(
        {
          role: "menuitem",
          tabindex: -1,
          disabled: item.disabled,
          "aria-disabled": item.disabled,
          "data-danger": item.danger ? "" : undefined,
          "data-adapttable-part": "context-menu-item",
          class: names.contextMenuItem,
          onClick: onSelect,
        },
        item.label
      ),
    Separator: () =>
      h(NDivider, {
        role: "separator",
        "data-adapttable-part": "context-menu-separator",
        class: names.contextMenuSeparator,
      }),
  };
}
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
        slots: contextSlots(props.classNames),
      })
    ),
  ]);
}
export type { ContextMenuOptions } from "@adapttable/vue/features";
