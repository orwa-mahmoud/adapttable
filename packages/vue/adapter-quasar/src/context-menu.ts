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
import { QItem, QItemSection, QSeparator } from "quasar";
import { defineComponent, h, type PropType } from "vue";

import { QuasarContextSurface } from "./actions/QuasarContextSurface";

function controls(
  dir: () => "ltr" | "rtl",
  names: () => Readonly<Record<string, string | undefined>>
): ContextMenuSlots {
  return {
    Surface: (control) => h(QuasarContextSurface, { control, dir: dir() }),
    Item: ({ item, onSelect }) =>
      h(
        QItem,
        {
          clickable: true,
          disable: item.disabled,
          tabindex: -1,
          role: "menuitem",
          "aria-disabled": item.disabled,
          class: [
            names().contextMenuItem,
            item.danger ? "text-negative" : undefined,
          ],
          "data-adapttable-part": "context-menu-item",
          onClick: onSelect,
        },
        () => h(QItemSection, {}, () => item.label)
      ),
    Separator: () =>
      h(QSeparator, {
        "data-adapttable-part": "context-menu-separator",
        class: names().contextMenuSeparator,
      }),
  };
}
const QuasarContextMenuControl = /*#__PURE__*/ defineComponent(
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
    name: "QuasarContextMenuControl",
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
  return extendFeature(bindingContextMenu(options), [
    slotRender(CONTEXT_MENU_CONTROL, (props) =>
      h(QuasarContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/vue";
export type { ContextMenuOptions } from "@adapttable/vue/features";
