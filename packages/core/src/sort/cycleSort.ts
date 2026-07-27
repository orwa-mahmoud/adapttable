import type { SortLevel } from "./compare";

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
