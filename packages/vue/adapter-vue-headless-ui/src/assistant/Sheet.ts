import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import { HeadlessDialog } from "../controls/dialog";

/** Chrome chooses initial/return focus; Dialog contains it and owns the portal. */
export const HeadlessAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    return () => {
      const close = props.onClose;
      return h(
        HeadlessDialog,
        {
          open: active.value && props.open,
          label: props.label,
          dir: props.dir,
          part: props.part,
          className: ["at-headless-assistant-sheet", props.className]
            .filter(Boolean)
            .join(" "),
          onClose: () => {
            if (active.value && props.open && props.onClose === close) close();
          },
        },
        { default: () => props.children }
      );
    };
  },
  {
    name: "HeadlessAssistantSheet",
    props: {
      label: { type: String as PropType<TableAssistantSheetProps["label"]> },
      part: { type: String as PropType<TableAssistantSheetProps["part"]> },
      className: {
        type: String as PropType<TableAssistantSheetProps["className"]>,
      },
      dir: { type: String as PropType<TableAssistantSheetProps["dir"]> },
      open: {
        type: Boolean as PropType<TableAssistantSheetProps["open"]>,
        default: undefined,
      },
      onClose: {
        type: Function as PropType<TableAssistantSheetProps["onClose"]>,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          TableAssistantSheetProps["children"]
        >,
        default: undefined,
      },
    },
  }
);
