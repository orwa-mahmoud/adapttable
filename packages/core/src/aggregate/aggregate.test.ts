import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  aggregate,
  AGGREGATE_NAMES,
  resolveAggregateValue,
  toAggregateInstant,
  toAggregateNumber,
  toAggregateOrdered,
} from "./aggregate";

interface Row {
  id: string;
  budget: number;
  team: string;
  score?: number | null;
  nested?: { depth: number };
}

const ROWS: Row[] = [
  { id: "a", budget: 100, team: "Core", score: 3, nested: { depth: 1 } },
  { id: "b", budget: 250, team: "Core", score: null, nested: { depth: 5 } },
  { id: "c", budget: 50, team: "Web", nested: { depth: 3 } },
];

describe("aggregate", () => {
  it("returns a mapper, so it drops into summaryRow and groupAggregates", () => {
    const mapper = aggregate<Row>({ budget: "sum" });
    expect(typeof mapper).toBe("function");
    expect(mapper(ROWS)).toEqual({ budget: 400 });
  });

  it("computes every built-in", () => {
    const all = aggregate<Row>({ budget: "sum" })(ROWS);
    expect(all).toEqual({ budget: 400 });
    expect(aggregate<Row>({ budget: "avg" })(ROWS)).toEqual({
      budget: 400 / 3,
    });
    expect(aggregate<Row>({ budget: "min" })(ROWS)).toEqual({ budget: 50 });
    expect(aggregate<Row>({ budget: "max" })(ROWS)).toEqual({ budget: 250 });
    expect(aggregate<Row>({ budget: "count" })(ROWS)).toEqual({ budget: 3 });
  });

  it("counts values that are present, not rows in the group", () => {
    // `score` is missing on one row and null on another
    expect(aggregate<Row>({ score: "count" })(ROWS)).toEqual({ score: 1 });
  });

  it("treats a missing value as absent, never as zero", () => {
    expect(aggregate<Row>({ score: "sum" })(ROWS)).toEqual({ score: 3 });
    expect(aggregate<Row>({ score: "avg" })(ROWS)).toEqual({ score: 3 });
  });

  it("sums nothing to zero but refuses to average nothing", () => {
    const empty: Row[] = [];
    expect(aggregate<Row>({ budget: "sum" })(empty)).toEqual({ budget: 0 });
    expect(aggregate<Row>({ budget: "avg" })(empty)).toEqual({
      budget: undefined,
    });
    expect(aggregate<Row>({ budget: "min" })(empty)).toEqual({
      budget: undefined,
    });
    expect(aggregate<Row>({ budget: "max" })(empty)).toEqual({
      budget: undefined,
    });
  });

  it("skips values that are not numbers rather than poisoning the total", () => {
    expect(aggregate<Row>({ team: "sum" })(ROWS)).toEqual({ team: 0 });
    expect(aggregate<Row>({ team: "count" })(ROWS)).toEqual({ team: 3 });
  });

  it("reads numeric strings, because a server often sends them", () => {
    const rows = [
      { id: "a", budget: "100" },
      { id: "b", budget: "250" },
    ];
    expect(aggregate({ budget: "sum" })(rows)).toEqual({ budget: 350 });
  });

  it("resolves values through a column's sortValue, like sorting does", () => {
    const columns: ColumnModel<Row>[] = [
      // the cell is formatted; the aggregate must see the number
      {
        key: "budget",
        exportValue: (r) => `$${r.budget}`,
        sortValue: (r) => r.budget,
      },
    ];
    expect(aggregate<Row>({ budget: "sum" }, { columns })(ROWS)).toEqual({
      budget: 400,
    });
  });

  it("reads a dotted data path when there is no column", () => {
    expect(aggregate<Row>({ "nested.depth": "sum" })(ROWS)).toEqual({
      "nested.depth": 9,
    });
  });

  it("takes a custom aggregator for anything the built-ins do not cover", () => {
    const distinct = (values: readonly unknown[]) => new Set(values).size;
    expect(aggregate<Row>({ team: distinct })(ROWS)).toEqual({ team: 2 });
  });

  it("formats results when asked, leaving the maths alone", () => {
    const money = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    const mapper = aggregate<Row>(
      { budget: "sum" },
      {
        format: (value) =>
          typeof value === "number" ? money.format(value) : value,
      }
    );
    expect(mapper(ROWS)).toEqual({ budget: "$400" });
  });

  it("computes several columns in one pass", () => {
    expect(
      aggregate<Row>({ budget: "sum", team: "count", score: "max" })(ROWS)
    ).toEqual({ budget: 400, team: 3, score: 3 });
  });

  it("resolves a cell the same way incremental totals will", () => {
    expect(resolveAggregateValue(ROWS[0]!, "budget", undefined)).toBe(100);
    expect(toAggregateNumber("250")).toBe(250);
    expect(toAggregateNumber("x")).toBeUndefined();
    expect(toAggregateNumber(null)).toBeUndefined();
  });

  it("publishes its built-in names for a picker UI", () => {
    expect(AGGREGATE_NAMES).toEqual(["sum", "avg", "count", "min", "max"]);
  });

  it("compares ISO dates and times without locale guessing", () => {
    const dated = [
      { when: "2024-03-01" },
      { when: "2024-01-15" },
      { when: "2024-02-01" },
    ];
    expect(aggregate({ when: "min" })(dated)).toEqual({ when: "2024-01-15" });
    expect(aggregate({ when: "max" })(dated)).toEqual({ when: "2024-03-01" });
    expect(aggregate({ when: "count" })(dated)).toEqual({ when: 3 });
    expect(toAggregateInstant("2024-01-15")).toBe(
      Date.parse("2024-01-15T00:00:00Z")
    );
    expect(toAggregateInstant("2024-01-15T08:30:00Z")).toBe(
      Date.parse("2024-01-15T08:30:00Z")
    );
    expect(toAggregateInstant("2024-01-15 08:30:00+05:30")).toBe(
      Date.parse("2024-01-15 08:30:00+05:30")
    );
    expect(toAggregateInstant("08:30:00.5")).toBe(30_600_500);
    expect(toAggregateInstant("09/09/2026")).toBeUndefined();
    expect(toAggregateInstant("9 Sep 2026")).toBeUndefined();
    expect(toAggregateInstant("2024-01-15Tnot-a-time")).toBeUndefined();
    expect(
      toAggregateOrdered(new Date("2024-01-15T00:00:00Z"))?.result
    ).toEqual(new Date("2024-01-15T00:00:00Z"));
  });

  it("skips invalid and missing temporal values, and keeps numeric min/max", () => {
    const mixed = [
      { when: "2024-01-15" },
      { when: "" },
      { when: null },
      { when: "not-a-date" },
    ];
    expect(aggregate({ when: "min" })(mixed)).toEqual({ when: "2024-01-15" });
    expect(aggregate({ when: "max" })(mixed)).toEqual({ when: "2024-01-15" });
    expect(
      aggregate({ score: "min" })([{ score: 3 }, { score: 1 }, { score: 9 }])
    ).toEqual({ score: 1 });
  });

  it("respects sortValue for temporal min/max", () => {
    const columns = [
      {
        key: "when",
        sortValue: (row: { when: string }) => `${row.when}T00:00:00Z`,
      },
    ];
    expect(
      aggregate(
        { when: "min" },
        { columns }
      )([{ when: "2024-06-01" }, { when: "2024-01-01" }])
    ).toEqual({ when: "2024-01-01T00:00:00Z" });
  });
});
