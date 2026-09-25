/**
 * Editing a pivot configuration.
 *
 * The operations have to be total, because a panel whose buttons can produce
 * an invalid pivot will produce one. Most of these tests are about what
 * happens at the edges — a field moved past the end, a field moved onto the
 * axis it is already on, a step off the top of a list.
 */
import { describe, expect, it } from "vitest";

import {
  assignField,
  availableFields,
  EMPTY_PIVOT_CONFIG,
  isPivotReady,
  measureLabel,
  moveField,
  type PivotField,
  removeField,
  setMeasureAgg,
} from "./pivotConfigModel";
import type { PivotConfig } from "./pivotModel";

const FIELDS: PivotField[] = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "quarter", label: "Quarter" },
  { key: "amount", label: "Amount" },
];

const config = (over: Partial<PivotConfig> = {}): PivotConfig => ({
  ...EMPTY_PIVOT_CONFIG,
  ...over,
});

describe("availableFields", () => {
  it("lists what is not on an axis yet", () => {
    const result = availableFields(FIELDS, config({ rows: ["region"] }));

    expect(result.map((f) => f.key)).toEqual(["team", "quarter", "amount"]);
  });

  it("keeps a field that is only used as a measure", () => {
    // A measure is not an axis: the same column can also be a dimension.
    const result = availableFields(
      FIELDS,
      config({ measures: [{ key: "amount", agg: "sum" }] })
    );

    expect(result.map((f) => f.key)).toContain("amount");
  });
});

describe("assignField", () => {
  it("puts a field on an axis", () => {
    expect(assignField(config(), "team", "rows").rows).toEqual(["team"]);
  });

  it("inserts at a position", () => {
    const start = config({ rows: ["region", "quarter"] });

    expect(assignField(start, "team", "rows", 1).rows).toEqual([
      "region",
      "team",
      "quarter",
    ]);
  });

  it("appends when the index is past the end", () => {
    const start = config({ rows: ["region"] });

    expect(assignField(start, "team", "rows", 99).rows).toEqual([
      "region",
      "team",
    ]);
  });

  it("takes a dimension off the other axis rather than pivoting it twice", () => {
    const start = config({ rows: ["team"], columns: ["quarter"] });
    const next = assignField(start, "team", "columns", 0);

    expect(next.rows).toEqual([]);
    expect(next.columns).toEqual(["team", "quarter"]);
  });

  it("moves a field within its own axis instead of duplicating it", () => {
    const start = config({ rows: ["region", "team"] });

    expect(assignField(start, "team", "rows", 0).rows).toEqual([
      "team",
      "region",
    ]);
  });

  it("adds a measure rather than moving one, so a column can repeat", () => {
    // Sum and count of the same column is an ordinary thing to want.
    const once = assignField(config(), "amount", "measures");
    const twice = assignField(once, "amount", "measures");

    expect(twice.measures.map((m) => m.key)).toEqual(["amount", "amount"]);
  });

  it("defaults a new measure to sum", () => {
    expect(assignField(config(), "amount", "measures").measures[0]?.agg).toBe(
      "sum"
    );
  });
});

describe("removeField", () => {
  it("takes a field off an axis", () => {
    const start = config({ rows: ["region", "team"] });

    expect(removeField(start, "rows", 0).rows).toEqual(["team"]);
  });

  it("removes one measure without disturbing its twin", () => {
    const start = config({
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "count" },
      ],
    });

    expect(removeField(start, "measures", 0).measures.map((m) => m.agg)) //
      .toEqual(["count"]);
  });

  it("changes nothing when the index is not there", () => {
    const start = config({ rows: ["region"] });

    expect(removeField(start, "rows", 9).rows).toEqual(["region"]);
  });
});

describe("moveField", () => {
  it("moves a field one step", () => {
    const start = config({ rows: ["region", "team", "quarter"] });

    expect(moveField(start, "rows", 1, -1).rows).toEqual([
      "team",
      "region",
      "quarter",
    ]);
    expect(moveField(start, "rows", 1, 1).rows).toEqual([
      "region",
      "quarter",
      "team",
    ]);
  });

  it("does nothing at either end, rather than wrapping", () => {
    // Wrapping makes the last press of a held key undo the whole journey.
    const start = config({ rows: ["region", "team"] });

    expect(moveField(start, "rows", 0, -1)).toBe(start);
    expect(moveField(start, "rows", 1, 1)).toBe(start);
  });

  it("does nothing for an index that is not there", () => {
    const start = config({ rows: ["region"] });

    expect(moveField(start, "rows", 5, 1)).toBe(start);
    expect(moveField(start, "rows", -1, 1)).toBe(start);
  });

  it("reorders measures too", () => {
    const start = config({
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "count" },
      ],
    });

    expect(moveField(start, "measures", 0, 1).measures.map((m) => m.agg)) //
      .toEqual(["count", "sum"]);
  });
});

describe("setMeasureAgg", () => {
  it("changes what one measure computes", () => {
    const start = config({
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "sum" },
      ],
    });
    const next = setMeasureAgg(start, 1, "avg");

    expect(next.measures.map((m) => m.agg)).toEqual(["sum", "avg"]);
  });
});

describe("isPivotReady", () => {
  it("is false until something fills the cells", () => {
    expect(isPivotReady(config({ rows: ["region"] }))).toBe(false);
    expect(
      isPivotReady(config({ measures: [{ key: "amount", agg: "sum" }] }))
    ).toBe(true);
  });
});

describe("measureLabel", () => {
  it("names a measure by its aggregation and its field", () => {
    expect(measureLabel({ key: "amount", agg: "sum" }, FIELDS)).toBe(
      "sum Amount"
    );
  });

  it("prefers an explicit label", () => {
    expect(
      measureLabel({ key: "amount", agg: "sum", label: "Revenue" }, FIELDS)
    ).toBe("Revenue");
  });

  it("falls back to the key for a field it does not know", () => {
    expect(measureLabel({ key: "mystery", agg: "sum" }, FIELDS)).toBe(
      "sum mystery"
    );
  });

  it("names a custom aggregator by its field alone", () => {
    expect(measureLabel({ key: "amount", agg: () => 1 }, FIELDS)).toBe(
      "Amount"
    );
  });
});
