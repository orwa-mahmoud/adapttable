/**
 * The pivot engine.
 *
 * The tests worth having here are the ones about arithmetic that has to add
 * up: a grand total that disagrees with its subtotals, or a row that falls
 * into no column and quietly vanishes, is a pivot table lying about the data.
 */
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../types";
import {
  pivot,
  PIVOT_BLANK,
  PIVOT_GRAND_TOTAL_KEY,
  type PivotConfig,
} from "./pivotModel";

interface Sale {
  team: string;
  quarter: string;
  region?: string;
  amount: number;
}

const SALES: Sale[] = [
  { team: "Alpha", quarter: "Q1", region: "EU", amount: 10 },
  { team: "Alpha", quarter: "Q2", region: "EU", amount: 20 },
  { team: "Beta", quarter: "Q1", region: "US", amount: 30 },
  { team: "Beta", quarter: "Q2", region: "US", amount: 40 },
];

const base: PivotConfig = {
  rows: ["team"],
  columns: ["quarter"],
  measures: [{ key: "amount", agg: "sum" }],
};

const line = (result: ReturnType<typeof pivot>, key: string) =>
  result.rows.find((row) => row.key === key);

describe("pivot", () => {
  it("turns a dimension into columns", () => {
    const result = pivot(SALES, base);

    expect(result.columnLeaves.map((leaf) => leaf.path[0])).toEqual([
      "Q1",
      "Q2",
      undefined, // the grand-total column
    ]);
    expect(line(result, "Alpha")?.cells).toEqual([10, 20, 30]);
    expect(line(result, "Beta")?.cells).toEqual([30, 40, 70]);
  });

  it("adds a grand-total line that matches its rows", () => {
    const result = pivot(SALES, base);
    const grand = line(result, PIVOT_GRAND_TOTAL_KEY);

    expect(grand?.kind).toBe("grandTotal");
    expect(grand?.cells).toEqual([40, 60, 100]);
  });

  it("leaves the grand-total column out when nothing splits the columns", () => {
    // Without column dimensions it would repeat the only column there is.
    const result = pivot(SALES, { ...base, columns: [] });

    expect(result.columnLeaves).toHaveLength(1);
    expect(result.columnLeaves[0]?.total).toBe(false);
    expect(line(result, "Alpha")?.cells).toEqual([30]);
  });

  it("nests dimensions on both axes", () => {
    const result = pivot(SALES, {
      ...base,
      rows: ["region", "team"],
      columns: ["quarter"],
    });

    expect(result.rowDepth).toBe(2);
    // A subtotal line for the outer dimension, then its inner lines.
    expect(result.rows.map((row) => `${row.kind}:${row.label}`)).toEqual([
      "subtotal:EU",
      "leaf:Alpha",
      "subtotal:US",
      "leaf:Beta",
      "grandTotal:",
    ]);
  });

  it("gives every subtotal the sum of what sits under it", () => {
    const wide: Sale[] = [
      ...SALES,
      { team: "Gamma", quarter: "Q1", region: "EU", amount: 5 },
    ];
    const result = pivot(wide, { ...base, rows: ["region", "team"] });

    // EU covers Alpha (10 + 20) and Gamma (5 in Q1).
    expect(line(result, "EU")?.cells).toEqual([15, 20, 35]);
    expect(line(result, "EU")?.count).toBe(3);
  });

  it("builds the column header tree with the right spans", () => {
    const result = pivot(SALES, {
      ...base,
      columns: ["region", "quarter"],
    });

    expect(result.columnTree.map((node) => [node.label, node.span])).toEqual([
      ["EU", 2],
      ["US", 2],
    ]);
    expect(result.columnTree[0]?.children.map((c) => c.label)).toEqual([
      "Q1",
      "Q2",
    ]);
  });

  it("spans a header over every measure beneath it", () => {
    const result = pivot(SALES, {
      ...base,
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "count", label: "Deals" },
      ],
    });

    // One column pair per quarter.
    expect(result.columnTree.map((node) => node.span)).toEqual([2, 2]);
    expect(line(result, "Alpha")?.cells).toEqual([10, 1, 20, 1, 30, 2]);
  });

  it("drops the lines under a collapsed subtotal, keeping its totals", () => {
    const result = pivot(
      SALES,
      { ...base, rows: ["region", "team"] },
      { collapsed: new Set(["EU"]) }
    );

    expect(result.rows.map((row) => row.label)).toEqual([
      "EU",
      "US",
      "Beta",
      "",
    ]);
    // Collapsing hides the detail; it must not change the arithmetic.
    expect(line(result, "EU")?.cells).toEqual([10, 20, 30]);
    expect(line(result, PIVOT_GRAND_TOTAL_KEY)?.cells).toEqual([40, 60, 100]);
  });

  it("keeps rows whose dimension value is missing", () => {
    // A row that falls into no bucket and disappears is how a pivot lies.
    const withGap: Sale[] = [
      ...SALES,
      { team: "Delta", quarter: "Q1", amount: 7 },
    ];
    const result = pivot(withGap, { ...base, rows: ["region"] });

    expect(result.rows.map((row) => row.label)).toContain(PIVOT_BLANK);
    expect(line(result, PIVOT_GRAND_TOTAL_KEY)?.cells).toEqual([47, 60, 107]);
  });

  it("reads values through a column's sortValue", () => {
    // The same rule sorting, grouping and the summary row follow — a pivot
    // that read the raw field would disagree with its own footer.
    const columns: ColumnDef<Sale>[] = [
      { key: "amount", header: "Amount", sortValue: (row) => row.amount * 2 },
    ];
    const result = pivot(SALES, { ...base, columns: [] }, { columns });

    expect(line(result, "Alpha")?.cells).toEqual([60]);
  });

  it("takes a custom aggregator", () => {
    const result = pivot(SALES, {
      ...base,
      columns: [],
      measures: [
        { key: "amount", agg: (values) => `${String(values.length)} sales` },
      ],
    });

    expect(line(result, "Alpha")?.cells).toEqual(["2 sales"]);
  });

  it("resolves a registered aggregator name when the caller passes the map", () => {
    const range = (values: readonly unknown[]) => {
      const numbers = values.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value)
      );
      if (numbers.length === 0) return undefined;
      return Math.max(...numbers) - Math.min(...numbers);
    };
    const result = pivot(
      SALES,
      {
        ...base,
        columns: [],
        measures: [{ key: "amount", agg: "range" }],
      },
      { aggregators: new Map([["range", range]]) }
    );

    expect(line(result, "Alpha")?.cells).toEqual([10]);
  });

  it("an unknown name still computes nothing", () => {
    const result = pivot(SALES, {
      ...base,
      columns: [],
      measures: [{ key: "amount", agg: "no-such" }],
    });

    expect(line(result, "Alpha")?.cells).toEqual([undefined]);
  });

  it("formats cells when asked", () => {
    const result = pivot(
      SALES,
      { ...base, columns: [] },
      { format: (value) => `$${typeof value === "number" ? value : ""}` }
    );

    expect(line(result, "Alpha")?.cells).toEqual(["$30"]);
  });

  it("computes min, max, avg and count", () => {
    const result = pivot(SALES, {
      rows: [],
      columns: [],
      measures: [
        { key: "amount", agg: "min" },
        { key: "amount", agg: "max" },
        { key: "amount", agg: "avg" },
        { key: "amount", agg: "count" },
      ],
      grandTotals: false,
    });

    expect(result.rows[0]?.cells).toEqual([10, 40, 25, 4]);
  });

  it("reports no value rather than zero when nothing is summable", () => {
    // A missing budget is not a $0 budget.
    const result = pivot(
      [{ team: "Alpha", quarter: "Q1", amount: Number.NaN }],
      {
        ...base,
        columns: [],
      }
    );

    expect(line(result, "Alpha")?.cells).toEqual([undefined]);
  });

  it("sums amounts that arrived as strings", () => {
    // JSON has no number type discipline: an API that sends "10.50" is
    // ordinary, and a pivot that ignored it would report a total of nothing.
    const result = pivot(
      [
        { team: "Alpha", quarter: "Q1", amount: "10.5" as never },
        { team: "Alpha", quarter: "Q1", amount: " 4 " as never },
        { team: "Alpha", quarter: "Q1", amount: "not a number" as never },
      ],
      { ...base, columns: [] }
    );

    expect(line(result, "Alpha")?.cells).toEqual([14.5]);
  });

  it("shows nothing for a measure the configuration does not carry", () => {
    // A stale measure object — one the panel removed while a render was in
    // flight — must render an empty cell, not throw.
    const stale = { key: "amount", agg: "sum" } as const;
    const result = pivot(SALES, {
      ...base,
      columns: [],
      measures: [{ ...stale }],
    });
    const other = pivot(SALES, { ...base, columns: [], measures: [stale] });

    expect(result.rows[0]?.cells).toEqual(other.rows[0]?.cells);
  });

  it("can be asked for no subtotals", () => {
    const result = pivot(SALES, {
      ...base,
      rows: ["region", "team"],
      subtotals: false,
    });

    expect(result.rows.every((row) => row.kind !== "subtotal")).toBe(true);
  });

  it("can be asked for no grand total", () => {
    const result = pivot(SALES, { ...base, grandTotals: false });

    expect(result.rows.every((row) => row.kind !== "grandTotal")).toBe(true);
    expect(result.columnLeaves.every((leaf) => !leaf.total)).toBe(true);
  });

  it("pivots an empty table to nothing but its totals", () => {
    const result = pivot([], base);

    expect(result.columnTree).toEqual([]);
    expect(result.rows.map((row) => row.kind)).toEqual(["grandTotal"]);
  });

  it("sorts each level within its parent, not globally", () => {
    const rows: Sale[] = [
      { team: "B", quarter: "Q1", region: "West", amount: 1 },
      { team: "A", quarter: "Q1", region: "East", amount: 1 },
      { team: "C", quarter: "Q1", region: "East", amount: 1 },
    ];
    const result = pivot(rows, {
      ...base,
      rows: ["region", "team"],
      subtotals: false,
    });

    // East's teams sort among themselves, then West's.
    expect(result.rows.filter((r) => r.kind === "leaf").map((r) => r.label)) //
      .toEqual(["A", "C", "B"]);
  });
});
