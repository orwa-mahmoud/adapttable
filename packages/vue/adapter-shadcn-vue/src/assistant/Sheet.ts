import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import { Sheet, SheetContent, SheetTitle } from "../components/sheet";
import { useShadcnPortalContainer } from "../lib/portal";
import { assistantClass } from "./presentation";

/** Chrome chooses initial/return focus; the copied Sheet contains it and owns the portal. */
export const ShadcnAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const container = useShadcnPortalContainer();
    const content = () =>
      h(
        SheetContent,
        {
          class: [
            assistantClass,
            "w-full max-w-full overflow-y-auto p-4 sm:max-w-md",
            props.className,
          ],
          side: props.dir === "rtl" ? "left" : "right",
          showClose: false,
          closeLabel: props.label,
          portalTo: container(),
          dir: props.dir,
          "data-adapttable-part": props.part,
          "aria-describedby": undefined,
          onOpenAutoFocus: (event: Event) => event.preventDefault(),
          onCloseAutoFocus: (event: Event) => event.preventDefault(),
        },
        () => [
          h(SheetTitle, { class: "sr-only" }, () => props.label),
          props.children,
        ]
      );
    return () => {
      const close = props.onClose;
      return h(
        Sheet,
        {
          open: active.value && props.open,
          "onUpdate:open": (open: boolean) => {
            if (!open && active.value && props.open && props.onClose === close)
              close();
          },
        },
        content
      );
    };
  },
  {
    name: "ShadcnAssistantSheet",
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
