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
import { h } from "vue";
import { VDivider } from "vuetify/components/VDivider";
import { VListItem } from "vuetify/components/VList";

import { VuetifyContextSurface } from "./actions/VuetifyContextSurface";

function controls(
  dir: "ltr" | "rtl",
  names: Readonly<Record<string, string | undefined>> = {}
): ContextMenuSlots {
  return {
    Surface: (control) => h(VuetifyContextSurface, { control, dir }),
    Item: ({ item, onSelect }) =>
      h(
        VListItem,
        {
          link: true,
          disabled: item.disabled,
          role: "menuitem",
          "aria-disabled": item.disabled,
          class: [
            names.contextMenuItem,
            item.danger ? "text-error" : undefined,
          ],
          "data-adapttable-part": "context-menu-item",
          onClick: onSelect,
        },
        () => item.label
      ),
    Separator: () =>
      h(VDivider, {
        "data-adapttable-part": "context-menu-separator",
        class: names.contextMenuSeparator,
      }),
  };
}
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
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
