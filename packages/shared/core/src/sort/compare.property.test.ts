import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { sortRows, sortRowsMulti } from "./compare";

const rowsArb = fc.array(
  fc.record({
    id: fc.integer(),
    key: fc.integer({ min: -4, max: 4 }),
    tie: fc.integer({ min: -4, max: 4 }),
  }),
  { maxLength: 24 }
);

function stableIds<T>(
  rows: readonly T[],
  sorted: readonly T[],
  sameGroup: (a: T, b: T) => boolean
): void {
  for (const original of rows) {
    const peers = rows.filter((row) => sameGroup(row, original));
    const sortedPeers = sorted.filter((row) => sameGroup(row, original));
    expect(sortedPeers).toEqual(peers);
  }
}

describe("sortRows — properties", () => {
  it("keeps equal keys in their original relative order", () => {
    fc.assert(
      fc.property(
        rowsArb,
        fc.constantFrom("asc", "desc"),
        (rows, direction) => {
          const before = rows.map((row) => row.id);
          const sorted = sortRows(rows, (row) => row.key, direction);
          expect(sorted).toHaveLength(rows.length);
          expect(rows.map((row) => row.id)).toEqual(before);
          stableIds(rows, sorted, (a, b) => a.key === b.key);
        }
      )
    );
  });

  it("multi-sort is stable across a full tie", () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        const sorted = sortRowsMulti(
          rows,
          [
            { key: "key", dir: "asc" },
            { key: "tie", dir: "desc" },
          ],
          (row, column) => (column === "key" ? row.key : row.tie)
        );
        stableIds(rows, sorted, (a, b) => a.key === b.key && a.tie === b.tie);
      })
    );
  });
});
