import type { AdaptTableFeature } from "@adapttable/angular";
import { coreSelectionStats } from "@adapttable/core/binding";

/**
 * Aggregates for the selected cells.
 *
 * @returns The feature. A kit extends it with the status strip.
 *
 * @public
 */
export function selectionStats(): AdaptTableFeature {
  return coreSelectionStats();
}
