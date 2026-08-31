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
import { useClassNames } from "./components/classNamesContext";

import { SidePanel } from "./components/SidePanel";

function SidePanelSlot(props: Omit<SidePanelChromeProps, "slots">) {
  const classNames = useClassNames();
  return <SidePanel {...props} classNames={classNames} />;
}

export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanelSlot {...props} />),
  ]);
}
