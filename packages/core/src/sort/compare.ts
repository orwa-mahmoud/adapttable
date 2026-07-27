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
 * Return a new array sorted by the given value extractor and direction.
 * The sort is stable (input order is preserved for equal keys). The input
 * array is not mutated.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to sort.
 * @param getValue - Extracts the comparison key for a row.
 * @param direction - Sort direction.
 * @returns A new, sorted array.
 */
export function sortRows<TRow>(
  rows: readonly TRow[],
  getValue: (row: TRow) => SortableValue,
  direction: SortDirection
): TRow[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows]
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => {
      // `null` / `undefined` / `NaN` always sort last, regardless of
      // direction — they must not be flipped to the top by a descending sort.
      const xNull = sortsLast(x.value);
      const yNull = sortsLast(y.value);
      if (xNull || yNull) {
        if (xNull && yNull) return x.index - y.index;
        return xNull ? 1 : -1;
      }
      const cmp = compareValues(x.value, y.value);
      return cmp === 0 ? x.index - y.index : cmp * factor;
    })
    .map((entry) => entry.row);
}

/** One level of a multi-column sort. */
export interface SortLevel {
  key: string;
  dir: SortDirection;
}

/**
 * Sort rows by a CHAIN of levels: ties at level N fall through to level
 * N+1. Null-ish values sort last per level regardless of direction, same
 * as {@link sortRows}.
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
        const a = x.values[i]!;
        const b = y.values[i]!;
        // Two unorderable values (null / undefined / NaN, in any mix) tie
        // at this level and fall through to the next one.
        const cmp = compareValues(a, b);
        if (cmp === 0) continue;
        // Null-ish sorts last regardless of direction — never negated.
        if (sortsLast(a) || sortsLast(b)) return cmp;
        return level.dir === "asc" ? cmp : -cmp;
      }
      // Stable: preserve the original order for full ties.
      return x.index - y.index;
    })
    .map((entry) => entry.row);
}
