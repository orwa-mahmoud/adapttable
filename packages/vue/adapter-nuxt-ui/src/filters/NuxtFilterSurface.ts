import "./nuxtFilterSurface.css";

import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UPopover from "@nuxt/ui/components/Popover.vue";
import USlideover from "@nuxt/ui/components/Slideover.vue";
import { defineComponent, h } from "vue";

type Props = FilterPanelSurfaceProps & {
  readonly modal: boolean;
  readonly part?: string;
};
export default defineComponent(
  (props: Props) => {
    const active = useScopeActivity();
    let reason: "escape" | "outside" | undefined;
    const update = (open: boolean) => {
      if (!open && active.value && props.open) props.onClose(reason);
      reason = undefined;
    };
    return () => {
      if (!active.value) return null;
      const content = {
        dir: props.dir,
        role: "dialog",
        "aria-label": props.label,
        "data-adapttable-part":
          props.part ?? (props.modal ? "filters-panel" : "filters-popover"),
        onEscapeKeyDown: () => {
          reason = "escape";
        },
        onInteractOutside: (event: CustomEvent<{ originalEvent: Event }>) => {
          const target = event.detail.originalEvent.target;
          if (target instanceof Node && props.anchor?.contains(target)) {
            event.preventDefault();
            return;
          }
          reason = "outside";
        },
      };
      const children = { content: () => props.children };
      if (props.modal)
        return h(
          USlideover,
          {
            open: props.open,
            title: props.label,
            side: props.dir === "rtl" ? "left" : "right",
            portal: props.container ?? true,
            content,
            transition: false,
            close: false,
            ui: { content: ["adapttable-nuxt-filter-drawer", props.className] },
            "onUpdate:open": update,
          },
          children
        );
      return h(
        UPopover,
        {
          open: props.open,
          reference: props.anchor ?? undefined,
          portal: props.container ?? true,
          content: { ...content, align: "start" },
          ui: { content: ["adapttable-nuxt-filter-popover", props.className] },
          "onUpdate:open": update,
        },
        children
      );
    };
  },
  {
    name: "NuxtFilterSurface",
    inheritAttrs: false,
    props: [
      "open",
      "label",
      "dir",
      "anchor",
      "container",
      "children",
      "onClose",
      "className",
      "modal",
      "part",
    ],
  }
);
