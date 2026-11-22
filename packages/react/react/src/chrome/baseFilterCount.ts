import type { ActiveFilterChip } from "@adapttable/core";

/**
 * The base table's active-filter count, before any feature runs: the host's
 * override, or the host's own chips. It picks the empty state and resets the
 * scroll; the filters feature publishes the full count with its chips.
 */
export function baseActiveFilterCount(
  override: number | undefined,
  hostChips: readonly ActiveFilterChip[] | undefined
): number {
  return override ?? hostChips?.length ?? 0;
}
