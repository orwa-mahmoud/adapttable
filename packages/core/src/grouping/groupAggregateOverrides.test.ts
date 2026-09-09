import { describe, expect, it } from "vitest";

import {
  parseGroupAggregateOverrides,
  queryAggregateOps,
  serializeGroupAggregateOverrides,
  withGroupAggregateOverrides,
  withQueryAggregateOverrides,
} from "./groupAggregateOverrides";

interface Row {
  budget: number;
  person: string;
}

const rows: readonly Row[] = [
  { budget: 10, person: "Ada" },
  { budget: 30, person: "Grace" },
];

describe("group aggregate overrides", () => {
  it("round-trips stable URL state and encoded column keys", () => {
    const serialized = serializeGroupAggregateOverrides({
      person: "none",
      "cost:center": "avg",
      budget: "sum",
    });

    expect(serialized).toBe("budget:sum,cost%3Acenter:avg,person:none");
    expect(parseGroupAggregateOverrides(serialized)).toEqual({
      budget: "sum",
      "cost:center": "avg",
      person: "none",
    });
  });

  it("ignores malformed and duplicate URL entries, and keeps host ids", () => {
    // `median` is a perfectly good id for an operation a column declared
    // itself. The parser knows nothing about columns, so it carries every
    // syntactically valid id back; which ones a column actually allows is
    // settled by `reconcileAggregations`, where the columns are known.
    expect(
      parseGroupAggregateOverrides(
        "budget:sum,budget:max,broken,person:median,name:none"
      )
    ).toEqual({ budget: "sum", person: "median", name: "none" });
  });

  it("preserves developer cells, replaces choices, and honors none", () => {
    const mapper = withGroupAggregateOverrides<Row>(
      () => ({ budget: "developer", person: 2 }),
      { budget: "avg", person: "none" },
      [
        { key: "budget", aggregatable: { operations: ["sum", "avg"] } },
        { key: "person" },
      ]
    );

    expect(mapper?.(rows)).toEqual({ budget: 20 });
  });

  it("refuses a disallowed override at execution, and leaves the host cell", () => {
    const mapper = withGroupAggregateOverrides<Row>(
      () => ({ budget: "developer", person: 2 }),
      { budget: "max", person: "sum" },
      [{ key: "budget", aggregatable: { operations: ["sum", "avg"] } }]
    );

    expect(mapper?.(rows)).toEqual({ budget: "developer", person: 2 });
  });

  it("does not invent a local answer for a backend-only operation", () => {
    const mapper = withGroupAggregateOverrides<Row>(
      () => ({ budget: "developer" }),
      { budget: "median" },
      [
        {
          key: "budget",
          aggregatable: {
            operations: [{ id: "median", label: "Median" }],
          },
        },
      ]
    );

    expect(mapper?.(rows)).toEqual({ budget: "developer" });
  });

  it("adds and removes server aggregate requests without reordering defaults", () => {
    expect(
      withQueryAggregateOverrides(
        [
          { key: "budget", fn: "sum" },
          { key: "person", fn: "count" },
        ],
        { budget: "max", person: "none", score: "avg" }
      )
    ).toEqual([
      { key: "budget", fn: "max" },
      { key: "score", fn: "avg" },
    ]);
  });

  it("refuses a server request the backend did not list, even without columns", () => {
    expect(
      withQueryAggregateOverrides(
        [{ key: "budget", fn: "sum" }],
        { budget: "median", load: "avg" },
        undefined,
        { grouping: "server", aggregateOperations: ["sum", "avg"] }
      )
    ).toEqual([
      { key: "budget", fn: "sum" },
      { key: "load", fn: "avg" },
    ]);
  });

  it("refuses a column-level disallowed override when columns are known", () => {
    expect(
      withQueryAggregateOverrides(
        [{ key: "budget", fn: "sum" }],
        { budget: "max" },
        [{ key: "budget", aggregatable: { operations: ["sum", "avg"] } }],
        { grouping: "server" }
      )
    ).toEqual([{ key: "budget", fn: "sum" }]);
  });

  it("runs a custom local calculate and ignores an empty request name", () => {
    const mapper = withGroupAggregateOverrides<Row>(
      () => ({ budget: "developer" }),
      { budget: "median" },
      [
        {
          key: "budget",
          aggregatable: {
            operations: [
              {
                id: "median",
                label: "Median",
                calculate: (values) => values.length,
              },
            ],
          },
        },
      ]
    );
    expect(mapper?.(rows)).toEqual({ budget: 2 });
    expect(queryAggregateOps([{ key: "budget", fn: "" }])).toBeUndefined();
    expect(queryAggregateOps([{ key: "budget", fn: "sum" }])).toEqual({
      budget: "sum",
    });
  });

  it("refuses an unlisted built-in when the server named no list", () => {
    expect(
      withQueryAggregateOverrides(
        [{ key: "budget", fn: "sum" }],
        { budget: "median" },
        undefined,
        { grouping: "server" }
      )
    ).toEqual([{ key: "budget", fn: "sum" }]);
  });

  it("keeps the developer mapper and silent server state by identity", () => {
    const base = () => ({ budget: 40 });
    expect(withGroupAggregateOverrides(base, {}, [])).toBe(base);
    expect(withQueryAggregateOverrides(undefined, {})).toBeUndefined();
  });
});
