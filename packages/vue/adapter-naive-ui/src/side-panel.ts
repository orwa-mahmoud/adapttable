import { type StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelSlots,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { defineComponent, h } from "vue";

import { naiveSidePanelSlots } from "./actions/sidePanelControls";
const NaiveSidePanel = /*#__PURE__*/ defineComponent(
  (props: Omit<SidePanelChromeProps, "slots" | "presentation">) => {
    const slots: SidePanelSlots = {
      Frame: (control) => naiveSidePanelSlots(props.classNames).Frame(control),
      Tab: (control) => naiveSidePanelSlots(props.classNames).Tab(control),
      Close: (control) => naiveSidePanelSlots(props.classNames).Close(control),
    };
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "NaiveSidePanel",
    props: ["model", "labels", "dir", "classNames", "container"],
  }
);
export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) => h(NaiveSidePanel, { ...props })),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
