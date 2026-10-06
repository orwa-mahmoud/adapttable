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
import { ContextMenuItem, ContextMenuSeparator } from "reka-ui";
import { h } from "vue";

import { RekaContextSurface } from "./actions/ContextSurface";

function controls(
  dir: "ltr" | "rtl",
  names: Readonly<Record<string, string | undefined>> = {}
): ContextMenuSlots {
  return {
    Surface: (props) => h(RekaContextSurface, { ...props, dir }),
    Item: ({ item, onSelect }) =>
      h(
        ContextMenuItem,
        {
          class: ["at-reka-menu-item", names.contextMenuItem],
          "data-adapttable-part": "context-menu-item",
          disabled: item.disabled,
          "data-danger": item.danger ? "" : undefined,
          onSelect: (event: Event) => {
            event.preventDefault();
            onSelect();
          },
        },
        { default: () => item.label }
      ),
    Separator: () =>
      h(ContextMenuSeparator, {
        "data-adapttable-part": "context-menu-separator",
        class: "at-reka-menu-separator",
      }),
  };
}
export function contextMenu<TRow>(
  options: ContextMenuOptions<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingContextMenu(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(ContextMenuChrome, {
        items: props.model.items,
        at: props.model.at,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.contextMenu,
        container: props.container,
        slots: controls(props.dir, props.classNames),
      })
    ),
  ]);
}
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/vue";
export type { ContextMenuOptions } from "@adapttable/vue/features";
