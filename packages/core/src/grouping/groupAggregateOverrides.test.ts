import { describe, expect, it } from "vitest";

import {
  parseGroupAggregateOverrides,
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

  it("ignores malformed, duplicate, and unknown URL entries", () => {
    expect(
      parseGroupAggregateOverrides(
        "budget:sum,budget:max,broken,person:median,name:none"
      )
    ).toEqual({ budget: "sum", name: "none" });
  });

  it("preserves developer cells, replaces choices, and honors none", () => {
    const mapper = withGroupAggregateOverrides<Row>(
      () => ({ budget: "developer", person: 2 }),
      { budget: "avg", person: "none" },
      [{ key: "budget" }, { key: "person" }]
    );

    expect(mapper?.(rows)).toEqual({ budget: 20 });
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

  it("keeps the developer mapper and silent server state by identity", () => {
    const base = () => ({ budget: 40 });
    expect(withGroupAggregateOverrides(base, {}, [])).toBe(base);
    expect(withQueryAggregateOverrides(undefined, {})).toBeUndefined();
  });
});
