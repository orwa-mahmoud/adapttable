import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NDrawer, NDrawerContent } from "naive-ui";
import { defineComponent, h, type PropType } from "vue";

/**
 * Chrome chooses initial and return focus; NDrawer contains focus and owns
 * the portal. Escape and mask dismissal become one close request to the
 * host, and the drawer stays open until the host closes it.
 */
export const NaiveAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const requestClose = () => {
      if (active.value && props.open) props.onClose();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    return () => {
      if (!active.value) return null;
      return h(
        NDrawer,
        {
          show: props.open,
          placement: props.dir === "rtl" ? "left" : "right",
          width: "min(28rem, 100vw)",
          autoFocus: false,
          closeOnEsc: false,
          maskClosable: false,
          role: "dialog",
          "aria-modal": "true",
          "aria-label": props.label,
          dir: props.dir,
          class: ["adapttable-naive-assistant-sheet", props.className],
          "data-adapttable-part": props.part,
          onKeydown: keydown,
          onMaskClick: requestClose,
        },
        {
          default: () =>
            h(NDrawerContent, {}, { default: () => props.children }),
        }
      );
    };
  },
  {
    name: "NaiveAssistantSheet",
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
