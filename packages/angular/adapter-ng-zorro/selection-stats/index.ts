/**
 * Selection aggregates — `@adapttable/ng-zorro/selection-stats`.
 *
 * The figures share the status strip, so this fills the same slot.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  selectionStats as bindingSelectionStats,
  slotRender,
  STATUS_BAR,
} from "@adapttable/angular";
import { AdaptStatusBarLive } from "@adapttable/ng-zorro/status-bar";

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
