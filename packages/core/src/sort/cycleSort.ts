import type { SortLevel } from "./compare";

/**
 * Alias for `Partial<SortLevel>` (the v1 standalone shape) — SortLevel is
 * the one sort-pair type in v2; deleted before the 2.0.0 release.
 */
export type SortState = Partial<SortLevel>;

/**
 * Advance the three-step sort cycle for a column header click:
 * inactive → ascending → descending → cleared.
 *
 * @param current - The current sort pair (both fields unset when inactive).
 * @param key - The column key that was clicked.
 * @returns The next sort state.
 */
export function nextSort(
  current: Partial<SortLevel>,
  key: string
): Partial<SortLevel> {
  if (current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return { key: undefined, dir: undefined };
}
