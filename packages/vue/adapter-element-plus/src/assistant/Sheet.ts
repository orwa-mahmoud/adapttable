import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { ElDrawer } from "element-plus";
import { defineComponent, h, type PropType } from "vue";

/**
 * Chrome chooses initial and return focus; ElDrawer contains focus and owns
 * the portal. Escape and backdrop dismissal become one close request to the
 * host, and the drawer stays open until the host closes it.
 */
export const ElementAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const requestClose = () => {
      if (active.value && props.open) props.onClose();
    };
    const preventDefault = (event: Event) => event.preventDefault();
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
        ElDrawer,
        {
          modelValue: props.open,
          direction: props.dir === "rtl" ? "ltr" : "rtl",
          size: "min(28rem, 100vw)",
          withHeader: false,
          showClose: false,
          appendToBody: true,
          destroyOnClose: true,
          closeOnPressEscape: false,
          title: props.label,
          "aria-label": props.label,
          dir: props.dir,
          class: ["adapttable-element-plus-assistant-sheet", props.className],
          "data-adapttable-part": props.part,
          beforeClose: requestClose,
          onKeydown: keydown,
          // Chrome places the initial focus and returns it to the launcher;
          // the drawer's trap only keeps focus inside while open.
          "on:focus-trap.focus-after-trapped": preventDefault,
          "on:focus-trap.focus-after-released": preventDefault,
        },
        { default: () => props.children }
      );
    };
  },
  {
    name: "ElementAssistantSheet",
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
