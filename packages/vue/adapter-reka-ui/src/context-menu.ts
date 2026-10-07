import type { TableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  type ContextMenuModel,
  type ContextMenuSlots,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/vue/features";
import { ContextMenuItem, ContextMenuSeparator } from "reka-ui";
import { defineComponent, h } from "vue";

import { RekaContextSurface } from "./actions/ContextSurface";

function controls(
  dir: () => "ltr" | "rtl",
  names: () => Readonly<Record<string, string | undefined>>
): ContextMenuSlots {
  return {
    Surface: (props) => h(RekaContextSurface, { ...props, dir: dir() }),
    Item: ({ item, onSelect }) =>
      h(
        ContextMenuItem,
        {
          class: ["at-reka-menu-item", names().contextMenuItem],
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
const RekaContextMenuControl = /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: ContextMenuModel }) => {
    const slots = controls(
      () => props.dir,
      () => props.classNames ?? {}
    );
    return () =>
      h(ContextMenuChrome, {
        items: props.model.items,
        at: props.model.at,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.contextMenu,
        container: props.container,
        slots,
      });
  },
  {
    name: "RekaContextMenuControl",
    props: ["model", "labels", "dir", "container", "classNames"],
  }
);
export function contextMenu<TRow>(
  options: ContextMenuOptions<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingContextMenu(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(RekaContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/vue";
export type { ContextMenuOptions } from "@adapttable/vue/features";
