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
import { defineComponent, h, type PropType } from "vue";

import { ShadcnContextSurface } from "./actions/ContextSurface";
import { menuItemClass } from "./actions/controls";

function controls(
  dir: () => "ltr" | "rtl",
  names: () => Readonly<Record<string, string | undefined>>
): ContextMenuSlots {
  return {
    Surface: (props) => h(ShadcnContextSurface, { ...props, dir: dir() }),
    Item: ({ item, onSelect }) =>
      h(
        ContextMenuItem,
        {
          class: [menuItemClass, names().contextMenuItem],
          "data-adapttable-part": "context-menu-item",
          "data-slot": "context-menu-item",
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
        class: "-mx-1 my-1 h-px bg-border",
      }),
  };
}
const ShadcnContextMenuControl = /*#__PURE__*/ defineComponent(
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
    name: "ShadcnContextMenuControl",
    props: {
      model: {
        type: Object as PropType<
          (ActionPresentation & { readonly model: ContextMenuModel })["model"]
        >,
      },
      labels: {
        type: Object as PropType<
          (ActionPresentation & { readonly model: ContextMenuModel })["labels"]
        >,
      },
      dir: {
        type: String as PropType<
          (ActionPresentation & { readonly model: ContextMenuModel })["dir"]
        >,
      },
      container: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: ContextMenuModel;
          })["container"]
        >,
      },
      classNames: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: ContextMenuModel;
          })["classNames"]
        >,
      },
    },
  }
);
export function contextMenu<TRow>(
  options: ContextMenuOptions<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingContextMenu(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(ShadcnContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/vue";
export type { ContextMenuOptions } from "@adapttable/vue/features";
