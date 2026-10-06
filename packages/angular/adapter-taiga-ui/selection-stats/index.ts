import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { STATUS_BAR } from "@adapttable/angular/adapter";
import { selectionStats as bindingSelectionStats } from "@adapttable/angular/features";
import { AdaptStatusBarLive } from "@adapttable/taiga-ui/status-bar";

/**
 * Selection aggregates — `@adapttable/taiga-ui/selection-stats`.
 *
 * The figures share the status strip, so this fills the same slot.
 *
 * @packageDocumentation
 */

/**
 * Aggregate figures for a multi-cell selection, shown in the status strip.
 *
 * @returns The feature.
 *
 * @public
 */
export function selectionStats(): AdaptTableFeature {
  return extendFeature(bindingSelectionStats(), [
    slotRender(STATUS_BAR, () => AdaptStatusBarLive),
  ]);
}
