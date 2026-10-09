import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QCard, QDialog } from "quasar";
import { defineComponent, h } from "vue";

/**
 * Chrome chooses initial and return focus; QDialog owns the portal and the
 * backdrop. Escape and backdrop dismissal become one close request to the
 * host, and the dialog stays open until the host closes it.
 */
export const QuasarAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const requestClose = () => {
      if (active.value && props.open) props.onClose();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
      // Quasar's own Escape handling reads the window; the sheet owns this one.
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    return () => {
      if (!active.value) return null;
      return h(
        QDialog,
        {
          modelValue: props.open,
          position: props.dir === "rtl" ? "left" : "right",
          fullHeight: true,
          noFocus: true,
          noRefocus: true,
          noEscDismiss: true,
          noShake: true,
          transitionDuration: 0,
          role: "dialog",
          "aria-label": props.label,
          dir: props.dir,
          "data-adapttable-part": props.part,
          onKeydown: keydown,
          "onUpdate:modelValue": (open: boolean) => {
            if (!open) requestClose();
          },
        },
        () =>
          h(
            QCard,
            { class: ["adapttable-quasar-assistant-sheet", props.className] },
            () => props.children
          )
      );
    };
  },
  {
    name: "QuasarAssistantSheet",
    props: ["label", "part", "className", "dir", "open", "onClose", "children"],
  }
);
