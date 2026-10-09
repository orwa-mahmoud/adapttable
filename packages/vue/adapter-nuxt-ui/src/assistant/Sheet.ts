import {
  type TableAssistantSheetProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import USlideover from "@nuxt/ui/components/Slideover.vue";
import { defineComponent, h } from "vue";

const keepFocus = (event: Event) => {
  event.preventDefault();
};

/**
 * Chrome chooses initial and return focus; USlideover contains focus and owns
 * the portal. Escape and overlay dismissal become one close request to the
 * host, and the slideover stays open until the host closes it.
 */
export const NuxtAssistantSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const update = (open: boolean) => {
      if (!open && active.value && props.open) props.onClose();
    };
    return () => {
      if (!active.value) return null;
      const content = {
        role: "dialog",
        "aria-label": props.label,
        "data-adapttable-part": props.part,
        dir: props.dir,
        onOpenAutoFocus: keepFocus,
        onCloseAutoFocus: keepFocus,
      };
      return h(
        USlideover,
        {
          open: props.open,
          title: props.label,
          side: props.dir === "rtl" ? "left" : "right",
          close: false,
          content,
          ui: {
            content: ["adapttable-nuxt-assistant-sheet", props.className],
          },
          "onUpdate:open": update,
        },
        { content: () => props.children }
      );
    };
  },
  {
    name: "NuxtAssistantSheet",
    props: ["label", "part", "className", "dir", "open", "onClose", "children"],
  }
);
