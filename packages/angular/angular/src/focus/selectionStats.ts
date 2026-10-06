import {
  type SelectionStats,
  selectionStats as computeSelectionStats,
  type SelectionStatsOptions,
} from "@adapttable/core";

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
