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
import { defineComponent, h, type PropType } from "vue";

import { HeadlessContextSurface } from "./actions/ContextSurface";
import { headlessMenuItem } from "./controls/menu";
import { HeadlessPrimitive } from "./controls/primitive";

function controls(
  dir: () => "ltr" | "rtl",
  names: () => Readonly<Record<string, string | undefined>>
): ContextMenuSlots {
  return {
    Surface: (props) => h(HeadlessContextSurface, { ...props, dir: dir() }),
    Item: ({ item, onSelect }) =>
      headlessMenuItem(
        {
          class: names().contextMenuItem,
          "data-adapttable-part": "context-menu-item",
          "data-danger": item.danger ? "" : undefined,
          onClick: () => onSelect(),
        },
        () => item.label,
        item.disabled
      ),
    Separator: () =>
      h(HeadlessPrimitive, {
        as: "div",
        role: "separator",
        "data-adapttable-part": "context-menu-separator",
        class: "at-headless-menu-separator",
      }),
  };
}
const HeadlessContextMenuControl = /*#__PURE__*/ defineComponent(
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
    name: "HeadlessContextMenuControl",
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
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(bindingContextMenu<TRow>(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(HeadlessContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/vue";
export type { ContextMenuOptions } from "@adapttable/vue/features";
