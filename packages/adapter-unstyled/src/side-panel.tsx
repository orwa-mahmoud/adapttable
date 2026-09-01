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

import { useClassNames } from "./components/classNamesContext";
import { SidePanel } from "./components/SidePanel";

function SidePanelSlot(props: Readonly<Omit<SidePanelChromeProps, "slots">>) {
  const classNames = useClassNames();
  return <SidePanel {...props} classNames={classNames} />;
}

export function sidePanel(options: SidePanelOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanelSlot {...props} />),
  ]);
}
