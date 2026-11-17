/**
 * The built-ins fold rows directly. These tests hold them to the list-based
 * definition they replaced, value for value, and hold the incremental path to
 * the same answers after rows move.
 */
import { describe, expect, it } from "vitest";

import type {
  AggregateName,
  AggregateOrderedValue,
  Aggregator,
  ColumnMetadata,
} from "../contracts/columns";
import type { FeatureHostState } from "../features/currentHost";
import {
  addAggregateRow,
  createIncrementalAggregate,
  readIncrementalAggregate,
  removeAggregateRow,
} from "../rows/incrementalAggregate";
import { aggregate, toAggregateNumber, toAggregateOrdered } from "./aggregate";

interface Row {
  id: number;
  v: AggregateOrderedValue;
}

/** The list-based built-ins: every present value collected, then reduced. */
const LISTED: Record<AggregateName, Aggregator> = {
  sum: (values) => numbers(values).reduce((a, b) => a + b, 0),
  avg: (values) => {
    const ns = numbers(values);
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : undefined;
  },
  count: (values) => values.length,
  min: (values) => extreme(values, "min"),
  max: (values) => extreme(values, "max"),
};

function numbers(values: readonly AggregateOrderedValue[]): number[] {
  return values
    .map((value) => toAggregateNumber(value))
    .filter((n): n is number => n !== undefined);
}

function extreme(
  values: readonly AggregateOrderedValue[],
  which: "min" | "max"
): AggregateOrderedValue {
  let best: { rank: number; result: AggregateOrderedValue } | undefined;
  for (const value of values) {
    const ordered = toAggregateOrdered(value);
    if (!ordered) continue;
    if (
      !best ||
      (which === "min" ? ordered.rank < best.rank : ordered.rank > best.rank)
    ) {
      best = ordered;
    }
  }
  return best?.result;
}

const NAMES: AggregateName[] = ["sum", "avg", "count", "min", "max"];

/** Values that probe coercion, ties, cancellation and strict dates. */
const POOL: AggregateOrderedValue[] = [
  0.1,
  0.2,
  0.3,
  1e16,
  -1e16,
  1,
  -1,
  3,
  3,
  "3",
  " 4 ",
  "",
  "  ",
  "abc",
  Number.NaN,
  Number.POSITIVE_INFINITY,
  null,
  undefined,
  new Date("2026-01-02T00:00:00Z"),
  "2026-01-02",
  "2026-01-02T10:00:00Z",
  "12:30",
  "01/02/2026",
  true,
];

function seeded(seed: number) {
  let state = seed;
  return (max: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % max;
  };
}

function rowsFor(seed: number): Row[] {
  const next = seeded(seed);
  return Array.from({ length: next(40) }, (_, id) => ({
    id,
    v: POOL[next(POOL.length)],
  }));
}

describe("built-in folds", () => {
  it("equal the list-based built-ins on mixed, tied and cancelling values", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const rows = rowsFor(seed);
      const present = rows
        .map((row) => row.v)
        .filter((v) => v !== undefined && v !== null);
      for (const name of NAMES) {
        const got = aggregate<Row>({ v: name })(rows).v;
        expect(got, `${name} seed ${seed}`).toStrictEqual(
          LISTED[name](present)
        );
      }
    }
  });

  it("return the winning original value, the first of equal ranks", () => {
    const first = new Date("2026-03-01T00:00:00Z");
    const tie = "2026-03-01T00:00:00Z";
    const rows: Row[] = [
      { id: 1, v: first },
      { id: 2, v: tie },
    ];
    expect(aggregate<Row>({ v: "min" })(rows).v).toBe(first);
    expect(aggregate<Row>({ v: "max" })(rows).v).toBe(first);
  });

  it("read each cell once, column by column in row order", () => {
    const calls: string[] = [];
    const columns: ColumnMetadata<Row>[] = ["a", "b"].map((key) => ({
      key,
      sortValue: (row: Row) => {
        calls.push(`${key}${row.id}`);
        return row.id;
      },
    }));
    const rows: Row[] = [0, 1, 2].map((id) => ({ id, v: id }));
    aggregate<Row>({ a: "sum", b: "max" }, { columns })(rows);
    expect(calls).toEqual(["a0", "a1", "a2", "b0", "b1", "b2"]);
  });

  it("let a throwing getter fail the whole mapper", () => {
    const columns: ColumnMetadata<Row>[] = [
      {
        key: "v",
        sortValue: (row: Row) => {
          if (row.id === 1) throw new Error("bad row");
          return row.id;
        },
      },
    ];
    const rows: Row[] = [0, 1].map((id) => ({ id, v: id }));
    expect(() => aggregate<Row>({ v: "sum" }, { columns })(rows)).toThrow(
      "bad row"
    );
  });

  it("hand custom and registered aggregators the present values in order", () => {
    const seen: (readonly AggregateOrderedValue[])[] = [];
    const custom: Aggregator = (values) => {
      seen.push(values);
      return values.length;
    };
    const host = {
      aggregators: new Map<string, Aggregator>([["listed", custom]]),
    } as unknown as FeatureHostState;
    const rows: Row[] = [
      { id: 0, v: 2 },
      { id: 1, v: null },
      { id: 2, v: "x" },
    ];
    const out = aggregate<Row>(
      { v: custom, id: "listed", missing: "nothing" },
      { host }
    )(rows);
    expect(out).toEqual({ v: 2, id: 3 });
    expect(seen).toEqual([
      [2, "x"],
      [0, 1, 2],
    ]);
  });

  it("format each result once, after folding", () => {
    const out = aggregate<Row>(
      { v: "avg", id: "count" },
      {
        format: (value, key) =>
          `${key}:${typeof value === "number" ? value : "?"}`,
      }
    )([
      { id: 0, v: 1 },
      { id: 1, v: 2 },
    ]);
    expect(out).toEqual({ v: "v:1.5", id: "id:2" });
  });
});

/**
 * Values a fresh sum adds exactly. Cancellation makes a running sum differ
 * from a fresh one, so the running path is compared on these.
 */
function exact(value: AggregateOrderedValue): boolean {
  return (
    typeof value !== "number" ||
    (Number.isInteger(value) && Math.abs(value) < 1e6)
  );
}

type State = ReturnType<typeof createIncrementalAggregate<Row>>;

/** One random insert, removal or update, applied to both paths. */
function move(
  rows: Row[],
  state: State,
  next: (max: number) => number,
  id: number
): Row[] {
  const kind = next(3);
  if (kind === 0 || rows.length === 0) {
    const row = { id, v: POOL[next(POOL.length)] };
    if (!exact(row.v)) return rows;
    addAggregateRow(state, row);
    return [...rows, row];
  }
  const index = next(rows.length);
  const prev = rows[index]!;
  removeAggregateRow(state, prev);
  if (kind === 1) return rows.filter((_, i) => i !== index);
  const updated = { ...prev, v: next(7) - 3 };
  addAggregateRow(state, updated);
  return rows.map((row, i) => (i === index ? updated : row));
}

describe("incremental aggregates after rows move", () => {
  it("match a full pass after inserts, removals, updates and extrema removal", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = seeded(seed);
      const spec = { v: NAMES[next(NAMES.length)] };
      let rows = rowsFor(seed).filter((row) => exact(row.v));
      const state = createIncrementalAggregate<Row>(spec, rows);
      for (let step = 0; step < 12; step++) {
        rows = move(rows, state, next, 1000 + step);
        expect(
          readIncrementalAggregate(state, rows),
          `${spec.v} seed ${seed} step ${step}`
        ).toStrictEqual(aggregate<Row>(spec)(rows));
      }
    }
  });

  it("rescan when the current extreme leaves", () => {
    const rows: Row[] = [1, 5, 9].map((v, id) => ({ id, v }));
    const max = createIncrementalAggregate<Row>({ v: "max" }, rows);
    removeAggregateRow(max, rows[2]!);
    expect(readIncrementalAggregate(max, rows.slice(0, 2))).toEqual({ v: 5 });
    const min = createIncrementalAggregate<Row>({ v: "min" }, rows);
    removeAggregateRow(min, rows[0]!);
    expect(readIncrementalAggregate(min, rows.slice(1))).toEqual({ v: 5 });
  });
});
