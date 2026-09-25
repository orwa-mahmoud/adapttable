/**
 * Server-side pivoting.
 *
 * The property that matters is that a server's answer and a local
 * calculation produce the SAME result shape — otherwise every adapter needs
 * two rendering paths and the two drift.
 */
import { describe, expect, it } from "vitest";

import { pivot, PIVOT_GRAND_TOTAL_KEY, type PivotConfig } from "./pivotModel";
import { type QueryPivotPage, serverPivotResult } from "./serverPivot";

const config: PivotConfig = {
  rows: ["team"],
  columns: ["quarter"],
  measures: [{ key: "amount", agg: "sum" }],
};

// A whole answer: two quarters across the top, a row per team, each line's own
// total for the grand-total column, and the grand-total line at the end.
const page: QueryPivotPage = {
  columns: [["Q1"], ["Q2"]],
  rows: [
    { path: ["Alpha"], cells: [10, 20], totals: [30], count: 2 },
    { path: ["Beta"], cells: [30, 40], totals: [70], count: 2 },
  ],
  total: { path: [], cells: [40, 60], totals: [100], count: 4 },
};

describe("serverPivotResult", () => {
  it("renders the server's numbers in the server's order", () => {
    const result = serverPivotResult(page, { config });

    expect(result.rows.map((row) => row.label)).toEqual(["Alpha", "Beta", ""]);
    expect(result.rows[0]?.cells).toEqual([10, 20, 30]);
  });

  it("marks the total line as the grand total", () => {
    const result = serverPivotResult(page, { config });
    const grand = result.rows.find((row) => row.key === PIVOT_GRAND_TOTAL_KEY);

    expect(grand?.kind).toBe("grandTotal");
    expect(grand?.cells).toEqual([40, 60, 100]);
  });

  it("produces the same shape the local engine does", () => {
    // Not the same numbers — the same SHAPE, from the same configuration. Every
    // leaf, including the grand-total column: a host moving a table from the
    // local engine to a server-backed one must not lose a column on the way,
    // and a comparison that filtered the total leaves out could not see it go.
    const local = pivot(
      [
        { team: "Alpha", quarter: "Q1", amount: 10 },
        { team: "Alpha", quarter: "Q2", amount: 20 },
      ],
      config
    );
    const remote = serverPivotResult(
      {
        columns: [["Q1"], ["Q2"]],
        rows: [{ path: ["Alpha"], cells: [10, 20], totals: [30] }],
        total: { path: [], cells: [10, 20], totals: [30] },
      },
      { config }
    );

    const byName = (a: string, b: string) => a.localeCompare(b);
    expect(Object.keys(remote).sort(byName)).toEqual(
      Object.keys(local).sort(byName)
    );
    expect(remote.rowDepth).toBe(local.rowDepth);
    // The keys are the contract: column-level state travels on them, so a leaf
    // key that agreed on the path and disagreed on the byte between it and the
    // measure would be a different column with the same header.
    const leaf = (l: {
      key: string;
      path: readonly string[];
      total: boolean;
    }) => [l.key, l.path, l.total] as const;
    expect(remote.columnLeaves.map(leaf)).toEqual(local.columnLeaves.map(leaf));
    expect(remote.rows.map((row) => [row.key, row.kind, row.depth])).toEqual(
      local.rows.map((row) => [row.key, row.kind, row.depth])
    );
  });

  it("keeps the grand-total column the configuration asked for", () => {
    const result = serverPivotResult(
      {
        columns: [["Q1"], ["Q2"]],
        rows: [{ path: ["Alpha"], cells: [10, 20], totals: [30] }],
      },
      { config }
    );

    expect(result.columnLeaves.map((column) => column.total)).toEqual([
      false,
      false,
      true,
    ]);
    expect(result.rows[0]?.cells).toEqual([10, 20, 30]);
  });

  it("leaves the total column empty when the server does not total", () => {
    // Summing sums is not how an average totals, so core does not guess. An
    // absent `totals` is an absent value, the same rule an absent cell follows.
    const result = serverPivotResult(
      { columns: [["Q1"]], rows: [{ path: ["Alpha"], cells: [10] }] },
      { config }
    );

    expect(result.columnLeaves).toHaveLength(2);
    expect(result.rows[0]?.cells).toEqual([10, undefined]);
  });

  it("has no total column when grand totals are off", () => {
    const result = serverPivotResult(
      { columns: [["Q1"]], rows: [{ path: ["Alpha"], cells: [10] }] },
      { config: { ...config, grandTotals: false } }
    );

    expect(result.columnLeaves.every((column) => !column.total)).toBe(true);
  });

  it("has no total column when nothing splits the columns", () => {
    // It would repeat the only column there is — the local engine's rule.
    const result = serverPivotResult(
      { columns: [[]], rows: [{ path: ["Alpha"], cells: [10] }] },
      { config: { ...config, columns: [] } }
    );

    expect(result.columnLeaves).toHaveLength(1);
    expect(result.columnLeaves[0]?.total).toBe(false);
  });

  it("totals the grand-total line into the corner cell", () => {
    const result = serverPivotResult(
      {
        columns: [["Q1"], ["Q2"]],
        rows: [{ path: ["Alpha"], cells: [10, 20], totals: [30] }],
        total: { path: [], cells: [10, 20], totals: [30] },
      },
      { config }
    );
    const grand = result.rows.find((row) => row.key === PIVOT_GRAND_TOTAL_KEY);

    expect(grand?.cells).toEqual([10, 20, 30]);
  });

  it("rebuilds the column header tree with its spans", () => {
    const result = serverPivotResult(
      {
        columns: [
          ["EU", "Q1"],
          ["EU", "Q2"],
          ["US", "Q1"],
        ],
        rows: [{ path: ["Alpha"], cells: [1, 2, 3] }],
      },
      { config: { ...config, columns: ["region", "quarter"] } }
    );

    expect(result.columnTree.map((node) => [node.label, node.span])).toEqual([
      ["EU", 2],
      ["US", 1],
    ]);
  });

  it("multiplies the server's column paths by the measures", () => {
    // The total column is multiplied too: one path and two measures is two
    // columns of numbers and two of totals.
    const result = serverPivotResult(
      {
        columns: [["Q1"]],
        rows: [{ path: ["Alpha"], cells: [10, 1], totals: [10, 1] }],
      },
      {
        config: {
          ...config,
          measures: [
            { key: "amount", agg: "sum" },
            { key: "amount", agg: "count" },
          ],
        },
      }
    );

    expect(result.columnLeaves).toHaveLength(4);
    expect(result.rows[0]?.cells).toEqual([10, 1, 10, 1]);
  });

  it("treats a cell the server omitted as empty, not zero", () => {
    // Grand totals off, so the one empty cell is the one the server skipped.
    const result = serverPivotResult(
      { columns: [["Q1"], ["Q2"]], rows: [{ path: ["Alpha"], cells: [10] }] },
      { config: { ...config, grandTotals: false } }
    );

    expect(result.rows[0]?.cells).toEqual([10, undefined]);
  });

  it("honours a subtotal line the server marked", () => {
    const result = serverPivotResult(
      {
        columns: [["Q1"]],
        rows: [
          { path: ["EU"], cells: [30], subtotal: true },
          { path: ["EU", "Alpha"], cells: [30] },
        ],
      },
      { config: { ...config, rows: ["region", "team"] } }
    );

    expect(result.rows.map((row) => row.kind)).toEqual(["subtotal", "leaf"]);
    expect(result.rows[1]?.depth).toBe(1);
  });

  it("formats cells when asked", () => {
    const result = serverPivotResult(page, {
      config,
      format: (value) => `$${typeof value === "number" ? value : ""}`,
    });

    expect(result.rows[0]?.cells).toEqual(["$10", "$20", "$30"]);
  });

  it("renders a server answer with no total at all", () => {
    const result = serverPivotResult(
      { columns: [["Q1"]], rows: [{ path: ["Alpha"], cells: [1] }] },
      { config }
    );

    expect(result.rows.every((row) => row.kind !== "grandTotal")).toBe(true);
  });
});
