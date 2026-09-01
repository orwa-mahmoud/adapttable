import {
  extendFeature,
  SIDE_PANEL,
  type SidePanelChromeProps,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import {
  sidePanel as core,
  type SidePanelOptions,
} from "@adapttable/core/features";

import { SidePanel } from "./components/SidePanel";

function SidePanelSlot(props: Readonly<Omit<SidePanelChromeProps, "slots">>) {
  return <SidePanel {...props} />;
}

export function sidePanel(options: SidePanelOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanelSlot {...props} />),
  ]);
}
