/**
 * The aggregation library — the batteries for `summaryRow` and
 * `groupAggregates`.
 *
 * Both props take the same mapper: rows in, a record of cells out. Writing
 * that mapper by hand is fine for one total and tedious for five, and every
 * hand-rolled version re-solves the same edge cases — non-numeric values,
 * blanks, an empty group. `aggregate` builds the mapper from a
 * declaration instead:
 *
 * ```ts
 * summaryRow={aggregate({ budget: "sum", headcount: "avg" })}
 * ```
 *
 * The mapper API is untouched and still accepted anywhere: this returns one.
 *
 * Values are found the same way the table finds them elsewhere — the column's
 * `sortValue` if it has one, else the key's data path — so a formatted cell
 * (`accessor: r => money.format(r.budget)`) still aggregates on its number.
 */
import type { ReactNode } from "react";

import type { FeatureHostState } from "../features/currentHost";
import { currentFeatureHost } from "../features/currentHost";
import type { ColumnDef, SortableValue } from "../types";
import { getPath } from "../utils/path";

/**
 * The aggregate functions available by name.
 *
 * @internal
 */
export type AggregateName = "sum" | "avg" | "count" | "min" | "max";

/**
 * A custom aggregator: the values found for one column across the rows being
 * aggregated, already narrowed to those that are present.
 *
 * Return whatever the cell should show — a number, a formatted string, a
 * node. Return `undefined` for "no cell here".
 *
 * The return type is `ReactNode` so the built mapper is directly assignable
 * to `summaryRow` and `groupAggregates`, which is the whole point of it.
 *
 * @public
 */
export type Aggregator<TValue = SortableValue> = (
  values: readonly TValue[]
) => ReactNode;

/**
 * What to compute per column: a built-in name, or your own function.
 *
 * @internal
 */
export type AggregateSpec = Partial<Record<string, AggregateName | Aggregator>>;

/**
 * Options for `aggregate`.
 *
 * @internal
 */
export interface AggregateOptions<TRow> {
  /**
   * Columns, so values resolve through `sortValue` exactly as sorting and
   * grouping do. Without them, values come from the key's data path.
   */
  columns?: readonly ColumnDef<TRow>[];
  /**
   * Format a computed value for display. Receives the raw result and the
   * column key: `format: (v, key) => key === "budget" ? money.format(v) : v`.
   */
  format?: (value: ReactNode, key: string) => ReactNode;
  /**
   * The host of the table this mapper will run in. Omit it when the
   * table binds the call with `runWithFeatureHost`.
   */
  host?: FeatureHostState;
}

/**
 * Coerce one cell to a finite number the way the built-in aggregators do.
 * Non-numeric values are absent, never zero — a missing budget is not a
 * $0 row.
 *
 * @param value - The resolved cell value.
 * @returns The number, or `undefined` when it is not summable.
 */
export function toAggregateNumber(value: SortableValue): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Numbers only — everything else is not summable, and silently skipped. */
function numbers(values: readonly SortableValue[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = toAggregateNumber(v);
    if (n !== undefined) out.push(n);
  }
  return out;
}

/**
 * The built-ins.
 *
 * `count` counts rows that have a value, not rows in the group — a column
 * that is blank for half the group reports the half that is filled, which is
 * what a "count" cell under that column is asking about. `sum` of nothing is
 * `0`; `avg`, `min` and `max` of nothing are `undefined`, because an average
 * of no numbers is not zero, it is unanswerable.
 */
const BUILT_INS: Record<AggregateName, Aggregator> = {
  sum: (values) => numbers(values).reduce((a, b) => a + b, 0),
  avg: (values) => {
    const ns = numbers(values);
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : undefined;
  },
  count: (values) => values.length,
  min: (values) => {
    const ns = numbers(values);
    return ns.length ? Math.min(...ns) : undefined;
  },
  max: (values) => {
    const ns = numbers(values);
    return ns.length ? Math.max(...ns) : undefined;
  },
};

/**
 * Every built-in aggregate name, for a UI that offers a choice.
 *
 * @internal
 */
export const AGGREGATE_NAMES = Object.keys(BUILT_INS) as AggregateName[];

/**
 * Resolve one column's value from a row the way the rest of the table does.
 * Incremental aggregates use the same path so a patched total matches a
 * full `aggregate()` pass.
 *
 * @typeParam TRow - The row type.
 * @param row - The row to read.
 * @param key - The column key / data path.
 * @param column - The matching column, when the host passed one.
 */
export function resolveAggregateValue<TRow>(
  row: TRow,
  key: string,
  column: ColumnDef<TRow> | undefined
): SortableValue {
  if (column?.sortValue) return column.sortValue(row);
  return getPath(row, key) as SortableValue;
}

/**
 * Build a `summaryRow` / `groupAggregates` mapper from a declaration.
 *
 * @example
 * ```tsx
 * <DataTable
 *   summaryRow={aggregate({ budget: "sum", team: "count" }, { columns })}
 *   groupAggregates={aggregate({ budget: "sum" }, { columns })}
 * />
 * ```
 *
 * @internal
 */
export function aggregate<TRow>(
  spec: AggregateSpec,
  options: AggregateOptions<TRow> = {}
): (rows: readonly TRow[]) => Partial<Record<string, ReactNode>> {
  const { columns, format, host: boundHost } = options;
  const byKey = new Map(columns?.map((c) => [c.key, c]));
  const entries = Object.entries(spec);

  return (rows) => {
    const out: Partial<Record<string, ReactNode>> = {};
    for (const [key, fn] of entries) {
      if (!fn) continue;
      const aggregator =
        typeof fn === "string"
          ? (BUILT_INS[fn] ??
            (boundHost ?? currentFeatureHost())?.aggregators.get(fn))
          : fn;
      if (typeof aggregator !== "function") continue;
      const values: SortableValue[] = [];
      for (const row of rows) {
        const value = resolveAggregateValue(row, key, byKey.get(key));
        // A missing value is not a zero — skip it and let the aggregator see
        // only what is really there.
        if (value !== undefined && value !== null) values.push(value);
      }
      const result = aggregator(values);
      out[key] = format ? format(result, key) : result;
    }
    return out;
  };
}
