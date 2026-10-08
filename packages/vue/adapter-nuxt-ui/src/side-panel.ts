import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelSlots,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import UCard from "@nuxt/ui/components/Card.vue";
import { defineComponent, h } from "vue";

import NuxtButton from "./controls/NuxtButton.vue";

const NuxtSidePanel = /*#__PURE__*/ defineComponent(
  (props: Omit<SidePanelChromeProps, "slots" | "presentation">) => {
    const slots: SidePanelSlots = {
      Frame: (control) =>
        h(
          UCard,
          {
            as: "aside",
            "data-adapttable-part": "side-panel",
            "data-side": control.side,
            dir: props.dir,
            class: control.className,
            style: { minWidth: "min(18rem,100%)", maxWidth: "100%" },
          },
          () => control.children
        ),
      Tab: (control) =>
        h(
          NuxtButton,
          {
            attrs: {
              ...control.buttonProps,
              class: props.classNames?.sidePanelTab,
              variant: control.selected ? "soft" : "ghost",
            },
          },
          () => control.panel.label
        ),
      Close: (control) =>
        h(
          NuxtButton,
          {
            attrs: {
              "aria-label": control.label,
              "data-adapttable-part": "side-panel-close",
              class: props.classNames?.sidePanelClose,
              onClick: control.onClose,
            },
          },
          () => control.label
        ),
    };
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "NuxtSidePanel",
    props: ["model", "labels", "dir", "classNames", "container"],
  }
);

export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) => h(NuxtSidePanel, props)),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
