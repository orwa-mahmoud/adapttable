/**
 * Selection aggregates — the factory over core, and the figures themselves.
 *
 * The factory only records that the host asked. {@link selectionStatsOf}
 * counts, sums and averages the selected cells. The status bar is what
 * shows them.
 */
import {
  type SelectionStats,
  selectionStats as computeSelectionStats,
  type SelectionStatsOptions,
} from "@adapttable/core";
import { coreSelectionStats } from "@adapttable/core/binding";

import type { AdaptTableFeature } from "../featureHost";

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

/**
 * Count, sum, average, min and max over a cell rectangle.
 *
 * @param options - The rectangle and the rows under it. Off when the host
 *   did not ask, and `null` when nothing is selected.
 * @returns The figures, or `null`.
 *
 * @public
 */
export function selectionStatsOf<TRow>(
  options: SelectionStatsOptions<TRow>
): SelectionStats | null {
  return computeSelectionStats(options);
}

export type { SelectionStats, SelectionStatsOptions };
