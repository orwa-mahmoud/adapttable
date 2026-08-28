import type { SortableValue, SortDirection } from "../types";

/** `null` / `undefined` / `NaN` are unorderable and always sort last. */
function sortsLast(value: SortableValue): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

/**
 * Compare two sortable primitives for ascending order. `null` / `undefined` /
 * `NaN` sort last. Numbers compare numerically; everything else compares via
 * locale-aware string comparison.
 *
 * @returns Negative if `a < b`, positive if `a > b`, `0` if equal.
 *
 * @internal
 */
export function compareValues(a: SortableValue, b: SortableValue): number {
  // All unorderable values are EQUAL to each other (null vs undefined vs
  // NaN), keeping the comparator symmetric — `a === b` alone would let a
  // NaN pair fall through to the one-sided branches below.
  const aLast = sortsLast(a);
  const bLast = sortsLast(b);
  if (aLast || bLast) {
    if (aLast && bLast) return 0;
    return aLast ? 1 : -1;
  }
  if (a === b) return 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b));
}

/**
 * Compare two already-extracted sort keys the way {@link sortRows} does,
 * including "nulls last" regardless of direction and a stable index
 * tie-break. Incremental repositioning uses this so a patched row lands
 * where a full re-sort would have put it.
 *
 * @param a - The first key and its index in the unsorted (filtered) list.
 * @param b - The second key and its index.
 * @param direction - Sort direction.
 * @returns Negative if `a` belongs before `b`.
 */
export function compareSortEntries(
  a: { value: SortableValue; index: number },
  b: { value: SortableValue; index: number },
  direction: SortDirection
): number {
  const aLast = sortsLast(a.value);
  const bLast = sortsLast(b.value);
  if (aLast || bLast) {
    if (aLast && bLast) return a.index - b.index;
    return aLast ? 1 : -1;
  }
  const cmp = compareValues(a.value, b.value);
  if (cmp === 0) return a.index - b.index;
  return direction === "asc" ? cmp : -cmp;
}

/**
 * Compare one multi-sort level. `undefined` means a tie — including two
 * unorderable values — so the caller falls through to the next level.
 *
 * @param a - The first key.
 * @param b - The second key.
 * @param direction - Sort direction for this level.
 * @returns The ordering, or `undefined` when this level does not decide.
 */
export function compareSortLevel(
  a: SortableValue,
  b: SortableValue,
  direction: SortDirection
): number | undefined {
  const cmp = compareValues(a, b);
  if (cmp === 0) return undefined;
  if (sortsLast(a) || sortsLast(b)) return cmp;
  return direction === "asc" ? cmp : -cmp;
}

/**
 * First index in a sorted list where `compare(item)` is positive — the
 * insertion point that keeps the list ordered the way {@link sortRows} would.
 *
 * @typeParam T - The item type.
 * @param items - A list already in comparator order.
 * @param compare - Negative/zero when `item` belongs at or before the target.
 * @returns The index to splice at.
 */
export function sortedInsertIndex<T>(
  items: readonly T[],
  compare: (item: T) => number
): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compare(items[mid]!) <= 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Return a new array sorted by the given value extractor and direction.
 * The sort is stable (input order is preserved for equal keys). The input
 * array is not mutated.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to sort.
 * @param getValue - Extracts the comparison key for a row.
 * @param direction - Sort direction.
 * @returns A new, sorted array.
 *
 * @internal
 */
export function sortRows<TRow>(
  rows: readonly TRow[],
  getValue: (row: TRow) => SortableValue,
  direction: SortDirection
): TRow[] {
  return [...rows]
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => compareSortEntries(x, y, direction))
    .map((entry) => entry.row);
}

/**
 * One level of a multi-column sort.
 *
 * @public
 */
export interface SortLevel {
  /** Stable key for the entry. */
  key: string;
  /** Sort direction for this level. */
  dir: SortDirection;
}

/**
 * Sort rows by a CHAIN of levels: ties at level N fall through to level
 * N+1. Null-ish values sort last per level regardless of direction, same
 * as {@link sortRows}.
 *
 * @internal
 */
export function sortRowsMulti<TRow>(
  rows: readonly TRow[],
  levels: readonly SortLevel[],
  getValue: (row: TRow, key: string) => SortableValue
): TRow[] {
  if (levels.length === 0) return [...rows];
  return [...rows]
    .map((row, index) => ({
      row,
      index,
      values: levels.map((l) => getValue(row, l.key)),
    }))
    .sort((x, y) => {
      for (const [i, level] of levels.entries()) {
        const decided = compareSortLevel(x.values[i], y.values[i], level.dir);
        if (decided !== undefined) return decided;
      }
      // Stable: preserve the original order for full ties.
      return x.index - y.index;
    })
    .map((entry) => entry.row);
}
