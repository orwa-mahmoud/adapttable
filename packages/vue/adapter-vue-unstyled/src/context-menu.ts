import { type TableFeature } from "@adapttable/vue";
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

import { nativeContextMenuSlots } from "./actions/nativeControls";
const NativeContextMenuControl = /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: ContextMenuModel }) => {
    const slots: ContextMenuSlots = {
      Surface: (control) =>
        nativeContextMenuSlots(props.classNames).Surface(control),
      Item: (control) => nativeContextMenuSlots(props.classNames).Item(control),
      Separator: () => nativeContextMenuSlots(props.classNames).Separator(),
    };
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
    name: "NativeContextMenuControl",
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
      h(NativeContextMenuControl, props)
    ),
  ]);
}
export type { ContextMenuOptions } from "@adapttable/vue/features";
