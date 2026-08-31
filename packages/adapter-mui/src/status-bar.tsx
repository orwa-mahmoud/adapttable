import {
  slotRender,
  STATUS_BAR,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  selectionStats as coreSelectionStats,
  statusBar as coreStatusBar,
} from "@adapttable/core/features";

import { StatusBar } from "./components/StatusBar";

/**
 * The MUI strip, offered by whichever of the two features is composed.
 *
 * One element serves both, so the slot is single and draws it once even when a
 * table composes the pair.
 */
const draws = [
  slotRender(STATUS_BAR, (props) => <StatusBar {...props} />),
] as const;

/**
 * A footer strip of row, page and selection figures.
 *
 * @public
 */
export function statusBar<TRow>(): TableFeature<TRow> {
  return { ...coreStatusBar<TRow>(), renders: draws };
}

/**
 * Aggregate figures for a multi-cell selection, shown in that same strip.
 *
 * @public
 */
export function selectionStats<TRow>(): TableFeature<TRow> {
  return { ...coreSelectionStats<TRow>(), renders: draws };
}
