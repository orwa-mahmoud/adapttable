import {
  extendFeature,
  slotRender,
  STATUS_BAR,
  type StatusBarChromeProps,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/core/features";

import { StatusBar } from "./components/StatusBar";

function StatusSlot(props: Readonly<Omit<StatusBarChromeProps, "slots">>) {
  return <StatusBar {...props} />;
}

const draws = [slotRender(STATUS_BAR, (props) => <StatusSlot {...props} />)];

export function statusBar<TRow>(): TableFeature<TRow> {
  return extendFeature(coreStatusBar<TRow>(), draws);
}

export function selectionStats<TRow>(): TableFeature<TRow> {
  return extendFeature(coreSelectionStats<TRow>(), draws);
}
