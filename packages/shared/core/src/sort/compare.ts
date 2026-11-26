/** `null` / `undefined` / `NaN` are unorderable and always sort last. */
import type { SortableValue, SortDirection } from "../contracts/columns";
export type { SortLevel } from "../contracts/query";

function sortsLast(value: SortableValue): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

/**
 * Compare two sortable primitives for ascending order. `null` / `undefined` /
 * `NaN` sort last. Values of one type compare as that type — numbers
 * numerically, booleans false-first, strings locale-aware. Values of different
 * types order by type — booleans, then numbers, then strings — so a column
 * that mixes `10` and `"11"` still has one consistent order.
 *
 * @returns Negative if `a < b`, positive if `a > b`, `0` if equal.
 *
 * @public
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
  const rank = typeRank(a) - typeRank(b);
  if (rank !== 0) return rank;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b));
}

/** Where an orderable value's type sits when two values' types differ. */
function typeRank(value: SortableValue): number {
  if (typeof value === "boolean") return 0;
  if (typeof value === "number") return 1;
  return 2;
}

/**
 * Compare two already-extracted sort keys, with "nulls last" regardless of
 * direction and a stable index tie-break. Incremental repositioning uses this so a patched row lands
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
