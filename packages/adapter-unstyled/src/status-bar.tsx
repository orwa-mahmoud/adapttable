import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  STATUS_BAR,
  type StatusBarChromeProps,
} from "@adapttable/core/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/core/features";

import { useClassNames } from "./components/classNamesContext";
import { StatusBar } from "./components/StatusBar";

function StatusSlot(props: Readonly<Omit<StatusBarChromeProps, "slots">>) {
  const classNames = useClassNames();
  return <StatusBar {...props} classNames={classNames} />;
}

const draws = [slotRender(STATUS_BAR, (props) => <StatusSlot {...props} />)];

export function statusBar(): StaticTableFeature {
  return extendFeature(coreStatusBar(), draws);
}

export function selectionStats(): StaticTableFeature {
  return extendFeature(coreSelectionStats(), draws);
}
