import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { h } from "vue";

import { rekaSidePanel } from "./actions/SidePanel";

export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) =>
      h(SidePanelChrome, { ...props, presentation: rekaSidePanel })
    ),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
