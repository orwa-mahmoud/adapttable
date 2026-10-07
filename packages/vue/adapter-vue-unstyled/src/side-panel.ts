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

import { nativeSidePanelSlots } from "./actions/nativeControls";
const NativeSidePanel = /*#__PURE__*/ defineComponent(
  (props: Omit<SidePanelChromeProps, "slots" | "presentation">) => {
    const slots: SidePanelSlots = {
      Frame: (control) => nativeSidePanelSlots(props.classNames).Frame(control),
      Tab: (control) => nativeSidePanelSlots(props.classNames).Tab(control),
      Close: (control) => nativeSidePanelSlots(props.classNames).Close(control),
    };
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "NativeSidePanel",
    props: ["model", "labels", "dir", "classNames", "container"],
  }
);
export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) => h(NativeSidePanel, { ...props })),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
