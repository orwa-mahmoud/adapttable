import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  STATUS_BAR,
} from "@adapttable/react/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/react/features";

import { StatusBar } from "./components/StatusBar";

/**
 * The MUI strip, offered by whichever of the two features is composed.
 *
 * One element serves both, so the slot is single and draws it once even when a
 * table composes the pair. Concatenate onto the core live renders — replacing
 * `renders` would drop `SELECTION_STATS_LIVE`.
 */
const draws = [
  slotRender(STATUS_BAR, (props) => <StatusBar {...props} />),
] as const;

/**
 * A footer strip of row, page and selection figures.
 *
 * @public
 */
export function statusBar(): StaticTableFeature {
  return extendFeature(coreStatusBar(), draws);
}

/**
 * Aggregate figures for a multi-cell selection, shown in that same strip.
 *
 * @public
 */
export function selectionStats(): StaticTableFeature {
  return extendFeature(coreSelectionStats(), draws);
}
