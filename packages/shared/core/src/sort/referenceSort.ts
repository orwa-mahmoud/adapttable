/**
 * A full re-sort with the engine's own comparators, for specs that check an
 * incremental or staged sort lands rows where a fresh sort would.
 */
import type { SortableValue, SortDirection } from "../contracts/columns";
import type { SortLevel } from "../contracts/query";
import { compareSortEntries, compareSortLevel } from "./compare";

/** A new array sorted by one key; stable, nulls last in either direction. */
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

/** A new array sorted by a chain of levels; ties fall through, then input order. */
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
      values: levels.map((level) => getValue(row, level.key)),
    }))
    .sort((x, y) => {
      for (const [i, level] of levels.entries()) {
        const decided = compareSortLevel(x.values[i], y.values[i], level.dir);
        if (decided !== undefined) return decided;
      }
      return x.index - y.index;
    })
    .map((entry) => entry.row);
}
