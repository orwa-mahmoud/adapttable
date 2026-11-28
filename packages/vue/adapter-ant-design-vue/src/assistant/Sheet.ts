import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Drawer } from "ant-design-vue";
import { defineComponent, h, type PropType, shallowRef } from "vue";

import { trapTab } from "../controls/focusTrap";

/**
 * Chrome chooses initial and return focus; the Ant Design Vue drawer keeps focus inside and owns
 * the portal. Escape and backdrop dismissal become one close request to the
 * host, and the drawer stays open until the host closes it.
 */
export const AntdAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const requestClose = () => {
      if (active.value && props.open) props.onClose();
    };
    const panel = shallowRef<HTMLElement | null>(null);
    const keydown = (event: KeyboardEvent) => {
      if (panel.value && trapTab(event, panel.value)) return;
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    return () => {
      if (!active.value) return null;
      return h(
        Drawer,
        {
          open: props.open,
          placement: props.dir === "rtl" ? "left" : "right",
          width: "min(28rem, 100vw)",
          closable: false,
          destroyOnClose: true,
          keyboard: false,
          // Chrome chooses the initial focus, so the drawer must not.
          autofocus: false,
          maskClosable: true,
          title: undefined,
          bodyStyle: { padding: 0 },
          rootClassName: "adapttable-ant-design-vue-assistant-sheet",
          // Chrome places the initial focus and returns it to the launcher;
          // the drawer only keeps the page behind it inert while open.
          onClose: requestClose,
        },
        {
          // The drawer forwards no attribute, so the dialog's role, name, part
          // and key handling live on the panel inside it.
          default: () =>
            h(
              "div",
              {
                ref: (element: unknown) => {
                  panel.value = element instanceof HTMLElement ? element : null;
                },
                role: "dialog",
                "aria-modal": "true",
                "aria-label": props.label,
                "data-adapttable-part": props.part,
                dir: props.dir,
                tabindex: -1,
                class: props.className,
                style: { minBlockSize: "100%", outline: "none" },
                onKeydown: keydown,
              },
              [props.children]
            ),
        }
      );
    };
  },
  {
    name: "AntdAssistantSheet",
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
