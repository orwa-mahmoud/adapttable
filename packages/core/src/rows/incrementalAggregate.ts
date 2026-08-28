/**
 * Incremental built-in aggregates — the same numbers `aggregate`
 * would compute, updated from the rows a patch touched instead of a full
 * walk of the set.
 *
 * Custom aggregators and a dirty min/max (the old extremum left the set)
 * fall back to a rescan of the rows the total describes. That is still
 * the group or the filtered set, not the unfiltered source.
 */
import type { ReactNode } from "react";

import {
  aggregate,
  type AggregateName,
  type AggregateOptions,
  type AggregateSpec,
  resolveAggregateValue,
  toAggregateNumber,
} from "../aggregate/aggregate";
import type { ColumnDef, SortableValue } from "../types";

interface ColumnAcc {
  kind: AggregateName | "custom";
  sum: number;
  numericCount: number;
  presentCount: number;
  min: number | undefined;
  max: number | undefined;
  /** The old min or max left; `read` must rescan. */
  dirty: boolean;
}

interface ColumnBinding {
  key: string;
  acc: ColumnAcc;
}

/**
 * Running totals for one {@link AggregateSpec} over a changing row set.
 *
 * @typeParam TRow - The row type.
 */
export interface IncrementalAggregate<TRow> {
  spec: AggregateSpec;
  options: AggregateOptions<TRow>;
  columns: ReadonlyMap<string, ColumnDef<TRow>>;
  bindings: ColumnBinding[];
}

/**
 * Start a running total from the rows already in the set.
 *
 * @typeParam TRow - The row type.
 * @param spec - The same declaration `aggregate` takes.
 * @param rows - The rows the total currently describes.
 * @param options - Column resolvers and an optional formatter.
 */
export function createIncrementalAggregate<TRow>(
  spec: AggregateSpec,
  rows: readonly TRow[],
  options: AggregateOptions<TRow> = {}
): IncrementalAggregate<TRow> {
  const columns = new Map(
    options.columns?.map((column) => [column.key, column])
  );
  const bindings: ColumnBinding[] = [];
  for (const [key, fn] of Object.entries(spec)) {
    if (!fn) continue;
    const kind = builtInName(fn);
    bindings.push({
      key,
      acc: {
        kind: kind ?? "custom",
        sum: 0,
        numericCount: 0,
        presentCount: 0,
        min: undefined,
        max: undefined,
        dirty: kind === undefined,
      },
    });
  }
  const state: IncrementalAggregate<TRow> = {
    spec,
    options,
    columns,
    bindings,
  };
  for (const row of rows) addAggregateRow(state, row);
  return state;
}

/**
 * Fold one row into the running total.
 *
 * @typeParam TRow - The row type.
 * @param state - The running total.
 * @param row - The row that entered the set.
 */
export function addAggregateRow<TRow>(
  state: IncrementalAggregate<TRow>,
  row: TRow
): void {
  for (const { key, acc } of state.bindings) {
    applyValue(acc, valueOf(state, row, key), 1);
  }
}

/**
 * Fold one row out of the running total.
 *
 * @typeParam TRow - The row type.
 * @param state - The running total.
 * @param row - The row that left the set.
 */
export function removeAggregateRow<TRow>(
  state: IncrementalAggregate<TRow>,
  row: TRow
): void {
  for (const { key, acc } of state.bindings) {
    applyValue(acc, valueOf(state, row, key), -1);
  }
}

/**
 * Replace one row's contribution with another's.
 *
 * @typeParam TRow - The row type.
 * @param state - The running total.
 * @param prev - The row that left.
 * @param next - The row that entered.
 */
export function replaceAggregateRow<TRow>(
  state: IncrementalAggregate<TRow>,
  prev: TRow,
  next: TRow
): void {
  removeAggregateRow(state, prev);
  addAggregateRow(state, next);
}

/**
 * Read the current cells. When a built-in is dirty or a custom aggregator
 * is in play, rescans `rows` so the answer still matches `aggregate`.
 *
 * @typeParam TRow - The row type.
 * @param state - The running total.
 * @param rows - The rows the total describes, for a rescan.
 */
export function readIncrementalAggregate<TRow>(
  state: IncrementalAggregate<TRow>,
  rows: readonly TRow[]
): Partial<Record<string, ReactNode>> {
  if (state.bindings.some((binding) => binding.acc.kind === "custom")) {
    return aggregate(state.spec, state.options)(rows);
  }
  if (state.bindings.some((binding) => binding.acc.dirty)) {
    rescan(state, rows);
  }
  const out: Partial<Record<string, ReactNode>> = {};
  const format = state.options.format;
  for (const { key, acc } of state.bindings) {
    const result = cellOf(acc);
    out[key] = format ? format(result, key) : result;
  }
  return out;
}

function builtInName(fn: unknown): AggregateName | undefined {
  if (
    fn === "sum" ||
    fn === "avg" ||
    fn === "count" ||
    fn === "min" ||
    fn === "max"
  ) {
    return fn;
  }
  return undefined;
}

function valueOf<TRow>(
  state: IncrementalAggregate<TRow>,
  row: TRow,
  key: string
): SortableValue {
  return resolveAggregateValue(row, key, state.columns.get(key));
}

function applyValue(acc: ColumnAcc, value: SortableValue, sign: 1 | -1): void {
  if (acc.kind === "custom") {
    acc.dirty = true;
    return;
  }
  if (value === undefined || value === null) return;
  acc.presentCount += sign;
  const n = toAggregateNumber(value);
  if (n === undefined) return;
  acc.sum += sign * n;
  acc.numericCount += sign;
  if (sign === 1) {
    acc.min = acc.min === undefined ? n : Math.min(acc.min, n);
    acc.max = acc.max === undefined ? n : Math.max(acc.max, n);
    return;
  }
  if (acc.numericCount <= 0) {
    acc.sum = 0;
    acc.numericCount = 0;
    acc.min = undefined;
    acc.max = undefined;
    acc.dirty = false;
    return;
  }
  if (n === acc.min || n === acc.max) acc.dirty = true;
}

function rescan<TRow>(
  state: IncrementalAggregate<TRow>,
  rows: readonly TRow[]
): void {
  for (const { acc } of state.bindings) {
    acc.sum = 0;
    acc.numericCount = 0;
    acc.presentCount = 0;
    acc.min = undefined;
    acc.max = undefined;
    acc.dirty = false;
  }
  for (const row of rows) addAggregateRow(state, row);
}

function cellOf(acc: ColumnAcc): number | undefined {
  if (acc.kind === "sum") return acc.sum;
  if (acc.kind === "count") return acc.presentCount;
  if (acc.kind === "avg") {
    return acc.numericCount ? acc.sum / acc.numericCount : undefined;
  }
  if (acc.kind === "min") return acc.min;
  return acc.max;
}
