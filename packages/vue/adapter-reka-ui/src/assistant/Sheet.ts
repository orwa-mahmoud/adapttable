import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { defineComponent, h } from "vue";

import { rekaPortal } from "../controls/portal";

/** Chrome chooses initial/return focus; Dialog contains it and owns the portal. */
export const RekaAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const content = () =>
      h(
        DialogContent,
        {
          class: [
            "at-reka-surface",
            "at-reka-assistant-sheet",
            props.className,
          ],
          dir: props.dir,
          "data-adapttable-part": props.part,
          "aria-describedby": undefined,
          onOpenAutoFocus: (event: Event) => event.preventDefault(),
          onCloseAutoFocus: (event: Event) => event.preventDefault(),
        },
        {
          default: () => [
            h(
              DialogTitle,
              { class: "at-reka-visually-hidden" },
              { default: () => props.label }
            ),
            props.children,
          ],
        }
      );
    const portal = () =>
      rekaPortal(DialogPortal, () => [
        h(DialogOverlay, { class: "at-reka-backdrop" }),
        content(),
      ]);
    return () => {
      const close = props.onClose;
      return h(
        DialogRoot,
        {
          open: active.value && props.open,
          "onUpdate:open": (open: boolean) => {
            if (!open && active.value && props.open && props.onClose === close)
              close();
          },
        },
        { default: portal }
      );
    };
  },
  {
    name: "RekaAssistantSheet",
    props: ["label", "part", "className", "dir", "open", "onClose", "children"],
  }
);
