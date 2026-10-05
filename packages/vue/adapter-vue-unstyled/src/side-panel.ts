import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  SIDE_PANEL_CONTROL,
  sidePanel as bindingSidePanel,
  SidePanelChrome,
} from "@adapttable/vue/side-panel";
import { h } from "vue";

import { nativeSidePanelSlots } from "./actions/nativeControls";
export function sidePanel(options: Parameters<typeof bindingSidePanel>[0]) {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) =>
      h(SidePanelChrome, {
        ...props,
        slots: nativeSidePanelSlots(props.classNames),
      })
    ),
  ]);
}
export type * from "@adapttable/vue/side-panel";
