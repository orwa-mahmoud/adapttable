import type { TableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  type ContextMenuModel,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/vue/features";
import { defineComponent, h, type PropType } from "vue";

import { elementContextMenuSlots } from "./actions/elementRemainingControls";
const ElementContextMenuControl = defineComponent(
  (props: ActionPresentation & { readonly model: ContextMenuModel }) => {
    const slots = elementContextMenuSlots(
      () => props.classNames ?? {},
      () => props.dir
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
    name: "ElementContextMenuControl",
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
      h(ElementContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuOptions } from "@adapttable/vue/features";
