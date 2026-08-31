import {
  extendFeature,
  SIDE_PANEL,
  type SidePanelChromeProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  sidePanel as core,
  type SidePanelOptions,
} from "@adapttable/core/features";

import { SidePanel } from "./components/SidePanel";

function SidePanelSlot(props: Omit<SidePanelChromeProps, "slots">) {
  return <SidePanel {...props} />;
}

export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanelSlot {...props} />),
  ]);
}
