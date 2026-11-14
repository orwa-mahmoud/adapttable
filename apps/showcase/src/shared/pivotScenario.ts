/**
 * The pivot page, written once for React, Vue and Angular: the fields the
 * builder offers, the pivot the page opens on, the squads it pivots, the
 * "range" measure the URL can name, how money cells read, and what the
 * corner cell says. A framework adds its panel, its table and the fold
 * control its row headers draw.
 */
import type {
  Aggregator,
  DisplayValue,
  PivotConfig,
  PivotField,
  PivotMeasure,
} from "@adapttable/core/pivot";

import { formatMoney } from "../people";

/** The fields the builder offers: three dimensions and two measures. */
export const PIVOT_FIELDS: readonly PivotField[] = [
  { key: "team", label: "Team" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "budget", label: "Budget" },
  { key: "utilization", label: "Utilization" },
];

/** Where the page starts: something already pivoted, so it shows a pivot. */
export const PIVOT_START: PivotConfig = {
  rows: ["team"],
  columns: ["status"],
  measures: [{ key: "budget", agg: "sum" }],
};

/** Max minus min: a named aggregator the URL can carry as `range:budget`. */
function rangeOf(values: readonly unknown[]): number | undefined {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  if (numbers.length === 0) return undefined;
  return Math.max(...numbers) - Math.min(...numbers);
}

/** The page's own aggregators, by the name the URL carries. */
export const PIVOT_AGGREGATORS: ReadonlyMap<string, Aggregator> = new Map([
  ["range", rangeOf],
]);

/**
 * A pivot cell as the page shows it: budget sums and averages read as money;
 * counts and everything else stay as computed.
 */
export function pivotCellFormat(
  value: DisplayValue | undefined,
  measure: PivotMeasure
): DisplayValue | undefined {
  return typeof value === "number" &&
    measure.key === "budget" &&
    measure.agg !== "count"
    ? formatMoney(value)
    : value;
}

/**
 * The corner cell names what is down the side, which is the question the rows
 * answer: "Team / Role", not the generic word for rows.
 *
 * @param config - The pivot.
 * @param fields - The fields, for their labels.
 * @param total - What the corner says when nothing is down the side.
 * @returns The corner caption.
 */
export function pivotRowHeader(
  config: PivotConfig,
  fields: readonly PivotField[],
  total: string
): string {
  return (
    config.rows
      .map((key) => fields.find((field) => field.key === key)?.label ?? key)
      .join(" / ") || total
  );
}

/**
 * Every line of a pivot is read together, so the page shows them all: a
 * page size above any pivot this dataset can produce.
 */
export const PIVOT_PAGE_SIZE = 500;
