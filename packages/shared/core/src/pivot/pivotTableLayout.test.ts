/**
 * A pivot laid out as a table, and the configuration panel's zones.
 */
import { describe, expect, it } from "vitest";

import { resolveLabels } from "../labels";
import { EMPTY_PIVOT_CONFIG, type PivotField } from "./pivotConfigModel";
import { pivot, type PivotConfig, type PivotRow } from "./pivotModel";
import {
  PIVOT_AGGREGATIONS,
  pivotMeasureAggName,
  pivotPanelZones,
  pivotZoneLabel,
} from "./pivotPanelModel";
import {
  PIVOT_ROW_COLUMN_KEY,
  pivotLeafColumnKey,
  pivotLeafGroup,
  pivotRowCaption,
  pivotRowIndentStyle,
  pivotTableLayout,
} from "./pivotTableLayout";

const ROWS = [
  { region: "EU", team: "A", quarter: "Q1", amount: 10 },
  { region: "EU", team: "B", quarter: "Q2", amount: 20 },
  { region: "US", team: "A", quarter: "Q1", amount: 5 },
];

const FIELDS: PivotField[] = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "quarter", label: "Quarter" },
  { key: "amount", label: "Amount" },
];

const CONFIG: PivotConfig = {
  rows: ["region", "team"],
  columns: ["quarter"],
  measures: [{ key: "amount", agg: "sum" }],
};

const labels = resolveLabels(undefined);

const line = (over: Partial<PivotRow> = {}): PivotRow => ({
  key: "k",
  path: [],
  depth: 0,
  kind: "leaf",
  label: "EU",
  cells: [],
  count: 1,
  ...over,
});

describe("pivot table helpers", () => {
  it("keys, groups and captions", () => {
    expect(PIVOT_ROW_COLUMN_KEY).toBe("pivot-row");
    expect(pivotLeafColumnKey(2)).toBe("pivot-2");
    const measure = { key: "amount", agg: "sum" as const };
    expect(
      pivotLeafGroup({ key: "t", path: [], measure, total: true }, "Total")
    ).toEqual(["Total"]);
    expect(
      pivotLeafGroup({ key: "p", path: ["Q1"], measure, total: false }, "T")
    ).toEqual(["Q1"]);
    expect(
      pivotLeafGroup({ key: "n", path: [], measure, total: false }, "T")
    ).toBeUndefined();
    expect(pivotRowCaption(line(), labels)).toBe("EU");
    expect(pivotRowCaption(line({ kind: "grandTotal" }), labels)).toBe(
      labels.pivotGrandTotal
    );
  });

  it("indents nested lines only", () => {
    expect(pivotRowIndentStyle(line({ depth: 2 }), 16)).toEqual({
      paddingInlineStart: "32px",
    });
    expect(pivotRowIndentStyle(line({ depth: 0 }), 16)).toBeUndefined();
    expect(pivotRowIndentStyle(line({ depth: 2 }), 0)).toBeUndefined();
  });
});

describe("pivotTableLayout", () => {
  it("lays out leaf columns and moves the grand total to the footer", () => {
    const result = pivot(ROWS, CONFIG);
    const layout = pivotTableLayout(result, { fields: FIELDS });
    expect(layout.rowHeaderLabel).toBe(labels.pivotRows);
    expect(layout.leafColumns).toHaveLength(result.columnLeaves.length);
    expect(layout.leafColumns[0]).toMatchObject({
      key: "pivot-0",
      index: 0,
      header: "sum Amount",
      group: ["Q1"],
    });
    expect(layout.leafColumns.at(-1)?.group).toEqual([labels.pivotTotal]);
    expect(layout.grandTotal?.kind).toBe("grandTotal");
    expect(layout.rows.some((row) => row.kind === "grandTotal")).toBe(false);
    expect(layout.summaryCells?.[PIVOT_ROW_COLUMN_KEY]).toBe(
      labels.pivotGrandTotal
    );
    expect(layout.summaryCells?.["pivot-0"]).toBe(layout.grandTotal?.cells[0]);
  });

  it("keeps every line and no footer without grand totals", () => {
    const result = pivot(ROWS, { ...CONFIG, grandTotals: false });
    const layout = pivotTableLayout(result);
    expect(layout.grandTotal).toBeUndefined();
    expect(layout.summaryCells).toBeUndefined();
    expect(layout.rows).toBe(result.rows);
    expect(layout.leafColumns[0]?.header).toBe("sum amount");
  });
});

describe("pivot panel model", () => {
  it("changes optional measure captions while preserving zones, keys and canonical aggregations", () => {
    const config: PivotConfig = {
      rows: ["region"],
      columns: [],
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "avg", label: "Authored average" },
        { key: "amount", agg: "median" },
        { key: "amount", agg: () => 1 },
      ],
    };
    const fields = [
      { key: "region", label: "المنطقة" },
      { key: "amount", label: "القيمة" },
    ];
    const original = pivotPanelZones(fields, config, labels);
    const localized = pivotPanelZones(fields, config, labels, {
      sum: "المجموع",
      avg: "المتوسط",
    });
    expect(localized.slice(0, 2)).toEqual(original.slice(0, 2));
    expect(localized[2]?.entries.map((entry) => entry.label)).toEqual([
      "المجموع القيمة",
      "Authored average",
      "median القيمة",
      "القيمة",
    ]);
    expect(
      localized[2]?.entries.map((entry) => ({ ...entry, label: undefined }))
    ).toEqual(
      original[2]?.entries.map((entry) => ({ ...entry, label: undefined }))
    );
    expect(config.measures[0]).toEqual({ key: "amount", agg: "sum" });
  });
  it("captions each zone", () => {
    expect(pivotZoneLabel("rows", labels)).toBe(labels.pivotRows);
    expect(pivotZoneLabel("columns", labels)).toBe(labels.pivotColumns);
    expect(pivotZoneLabel("measures", labels)).toBe(labels.pivotMeasures);
  });

  it("shows a measure's aggregation, or sum for a custom one", () => {
    const config: PivotConfig = {
      ...EMPTY_PIVOT_CONFIG,
      measures: [
        { key: "amount", agg: "avg" },
        { key: "amount", agg: "median" },
        { key: "amount", agg: () => 0 },
      ],
    };
    expect(PIVOT_AGGREGATIONS).toEqual(["sum", "avg", "count", "min", "max"]);
    expect(pivotMeasureAggName(config, 0)).toBe("avg");
    expect(pivotMeasureAggName(config, 1)).toBe("sum");
    expect(pivotMeasureAggName(config, 2)).toBe("sum");
    expect(pivotMeasureAggName(config, 9)).toBe("sum");
  });

  it("lists each zone's entries, moves and what can be added", () => {
    const config: PivotConfig = {
      rows: ["region", "unknown"],
      columns: [],
      measures: [
        { key: "amount", agg: "sum" },
        { key: "amount", agg: "max", label: "Peak" },
      ],
    };
    const [rows, columns, measures] = pivotPanelZones(FIELDS, config, labels);
    expect(rows?.zone).toBe("rows");
    expect(rows?.label).toBe(labels.pivotRows);
    expect(rows?.entries).toEqual([
      {
        key: "region",
        label: "Region",
        index: 0,
        canMoveUp: false,
        canMoveDown: true,
      },
      {
        key: "unknown",
        label: "unknown",
        index: 1,
        canMoveUp: true,
        canMoveDown: false,
      },
    ]);
    expect(rows?.addOptions.map((field) => field.key)).toEqual([
      "team",
      "quarter",
      "amount",
    ]);
    expect(columns?.entries).toEqual([]);
    expect(measures?.entries).toEqual([
      {
        key: "amount-0",
        label: "sum Amount",
        index: 0,
        canMoveUp: false,
        canMoveDown: true,
        aggregation: "sum",
      },
      {
        key: "amount-1",
        label: "Peak",
        index: 1,
        canMoveUp: true,
        canMoveDown: false,
        aggregation: "max",
      },
    ]);
    expect(measures?.addOptions).toBe(FIELDS);
  });
});
