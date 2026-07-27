import { describe, expect, it } from "vitest";

import { compareValues, sortRows, sortRowsMulti } from "./compare";

describe("compareValues", () => {
  it("returns 0 for equal values", () => {
    expect(compareValues(5, 5)).toBe(0);
  });
  it("sorts null / undefined / NaN last, and equal to each other", () => {
    expect(compareValues(null, 5)).toBe(1);
    expect(compareValues(5, undefined)).toBe(-1);
    expect(compareValues(NaN, 5)).toBe(1);
    expect(compareValues(5, NaN)).toBe(-1);
    // Unorderable values tie with each other — any nonzero answer here
    // would be asymmetric (both orderings used to return 1).
    expect(compareValues(undefined, null)).toBe(0);
    expect(compareValues(null, undefined)).toBe(0);
    expect(compareValues(NaN, NaN)).toBe(0);
  });
  it("compares numbers numerically", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
  });
  it("compares non-numbers as strings", () => {
    expect(compareValues("apple", "banana")).toBeLessThan(0);
    expect(compareValues(true, false)).not.toBe(0);
  });
});

describe("compareValues — booleans", () => {
  it("sorts booleans numerically (false before true)", () => {
    expect(compareValues(false, true)).toBeLessThan(0);
    expect(compareValues(true, false)).toBeGreaterThan(0);
    expect(compareValues(true, true)).toBe(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { id: "a", n: 3 },
    { id: "b", n: 1 },
    { id: "c", n: 2 },
  ];

  it("sorts ascending without mutating the input", () => {
    const out = sortRows(rows, (r) => r.n, "asc");
    expect(out.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(rows[0]?.id).toBe("a");
  });

  it("sorts descending", () => {
    expect(sortRows(rows, (r) => r.n, "desc").map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("sorts NaN values last in both directions", () => {
    const withNaN = [
      { id: "a", n: NaN },
      { id: "b", n: 1 },
      { id: "c", n: 2 },
    ];
    expect(sortRows(withNaN, (r) => r.n, "asc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortRows(withNaN, (r) => r.n, "desc").map((r) => r.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("is stable for equal keys", () => {
    const equal = [
      { id: "a", n: 1 },
      { id: "b", n: 1 },
      { id: "c", n: 1 },
    ];
    expect(sortRows(equal, (r) => r.n, "asc").map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortRows(equal, (r) => r.n, "desc").map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps null/undefined values last in BOTH directions", () => {
    const withNulls = [
      { id: "a", n: 2 as number | null },
      { id: "b", n: null },
      { id: "c", n: 1 },
      { id: "d", n: undefined as number | null | undefined },
    ];
    // ascending: values asc, nullish last (stable among themselves)
    expect(
      sortRows(withNulls, (r) => r.n ?? null, "asc").map((r) => r.id)
    ).toEqual(["c", "a", "b", "d"]);
    // descending: values desc, nullish STILL last (must not flip to top)
    expect(
      sortRows(withNulls, (r) => r.n ?? null, "desc").map((r) => r.id)
    ).toEqual(["a", "c", "b", "d"]);
  });
});

describe("sortRowsMulti", () => {
  interface R {
    team: string;
    age: number | null;
  }
  const rows: R[] = [
    { team: "b", age: 30 },
    { team: "a", age: 25 },
    { team: "a", age: 30 },
    { team: "a", age: null },
  ];
  const getValue = (row: R, key: string) =>
    key === "team" ? row.team : row.age;

  it("ties at level one fall through to level two", () => {
    const sorted = sortRowsMulti(
      rows,
      [
        { key: "team", dir: "asc" },
        { key: "age", dir: "desc" },
      ],
      getValue
    );
    expect(sorted.map((r) => `${r.team}:${String(r.age)}`)).toEqual([
      "a:30",
      "a:25",
      "a:null",
      "b:30",
    ]);
  });

  it("null-ish sorts last even on descending levels", () => {
    const sorted = sortRowsMulti(rows, [{ key: "age", dir: "desc" }], getValue);
    expect(sorted.at(-1)!.age).toBeNull();
  });

  it("no levels returns the original order; full ties stay stable", () => {
    expect(sortRowsMulti(rows, [], getValue)).toEqual(rows);
    const tied = sortRowsMulti(
      rows,
      [{ key: "team", dir: "asc" }],
      getValue
    ).filter((r) => r.team === "a");
    expect(tied.map((r) => r.age)).toEqual([25, 30, null]);
  });

  it("null-ish on either side sorts last; equal-compare falls to next level", () => {
    const data: R[] = [
      { team: "a", age: null },
      { team: "a", age: 20 },
    ];
    // b-side null: first element null vs second number.
    const byAge = sortRowsMulti(data, [{ key: "age", dir: "asc" }], getValue);
    expect(byAge[0]!.age).toBe(20);
    // compareValues returns 0 for equal non-null values → next level decides.
    const tied: R[] = [
      { team: "b", age: 20 },
      { team: "a", age: 20 },
    ];
    const out = sortRowsMulti(
      tied,
      [
        { key: "age", dir: "asc" },
        { key: "team", dir: "asc" },
      ],
      getValue
    );
    expect(out.map((r) => r.team)).toEqual(["a", "b"]);
  });

  it("descending levels negate the comparison", () => {
    const data: R[] = [
      { team: "a", age: 10 },
      { team: "b", age: 20 },
    ];
    const out = sortRowsMulti(data, [{ key: "team", dir: "desc" }], getValue);
    expect(out.map((r) => r.team)).toEqual(["b", "a"]);
  });

  it("the comparator is symmetric and transitive over unorderable mixes", () => {
    // Property check over every pair and triple of a mixed fixture: sign
    // symmetry (cmp(a,b) === -cmp(b,a)) and transitivity of <= — the
    // contract Array.prototype.sort requires. The old comparator returned
    // 1 for BOTH orderings of a NaN pair and of null-vs-undefined.
    const fixture = [
      null,
      undefined,
      Number.NaN,
      -3,
      0,
      7,
      "alpha",
      "beta",
      "",
    ] as const;
    for (const x of fixture) {
      for (const y of fixture) {
        expect(
          Math.sign(compareValues(x, y)) + Math.sign(compareValues(y, x))
        ).toBe(0);
        for (const z of fixture) {
          if (compareValues(x, y) <= 0 && compareValues(y, z) <= 0) {
            expect(compareValues(x, z)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
  });

  it("level-two ordering applies when level one ties on null-ish or NaN", () => {
    const data = [
      { team: null, age: 3 },
      { team: undefined, age: 1 },
      { team: Number.NaN, age: 2 },
      { team: "core", age: 9 },
    ] as unknown as R[];
    const out = sortRowsMulti(
      data,
      [
        { key: "team", dir: "asc" },
        { key: "age", dir: "asc" },
      ],
      getValue
    );
    // Orderable value first; the unorderable trio ties at level one and
    // is ordered by level two — not left in insertion order.
    expect(out.map((r) => r.age)).toEqual([9, 1, 2, 3]);
  });

  it("collation-equal but non-identical values fall through to the next level", () => {
    // NFC vs NFD "ä": canonically equivalent → localeCompare 0, but !==.
    const data = [
      { team: "\u00e4", age: 2 },
      { team: "a\u0308", age: 1 },
    ] as unknown as R[];
    const out = sortRowsMulti(
      data,
      [
        { key: "team", dir: "asc" }, // "B" vs "b": localeCompare 0, !==
        { key: "age", dir: "asc" },
      ],
      getValue
    );
    expect(out.map((r) => r.age)).toEqual([1, 2]);
  });
});
