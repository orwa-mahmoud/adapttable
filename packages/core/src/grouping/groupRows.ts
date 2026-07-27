import type { ReactNode } from "react";

import type { ColumnDef } from "../types";
import { getPath } from "../utils/path";

/**
 * One visual row in a single-level grouped body: a group header, or a leaf
 * data row belonging to a group. Adapters switch on `kind`.
 */
export type GroupedFlatEntry<TRow> =
  | {
      kind: "group";
      /** Stable id: `group:${groupBy}:${valueKey}`. */
      key: string;
      /** Raw group value (from sortValue / path). */
      value: unknown;
      /** Display label for the header (stringified value, or "(blank)"). */
      label: string;
      leafRows: readonly TRow[];
      leafIds: readonly string[];
      /** Present when the host passed `groupAggregates`. */
      aggregateCells?: Partial<Record<string, ReactNode>>;
      collapsed: boolean;
    }
  | {
      kind: "row";
      key: string;
      row: TRow;
      /** Index among leaves in the flat model (stable for selection chrome). */
      index: number;
      groupKey: string;
    };

/** Same mapper signature as `summaryRow` — one API for page footer + groups. */
export type GroupAggregatesFn<TRow> = (
  rows: readonly TRow[]
) => Partial<Record<string, ReactNode>>;

export interface BuildGroupedFlatModelOptions<TRow> {
  /** Leaf rows to partition (frontend: prefer `allFilteredRows`). */
  rows: readonly TRow[];
  /** Column key to group by. */
  groupBy: string;
  columns: readonly ColumnDef<TRow>[];
  getRowId: (row: TRow) => string;
  /** Collapsed group keys (from {@link useGroupCollapse}). */
  collapsedIds: ReadonlySet<string>;
  /** Optional per-group cells — same shape as `summaryRow`. */
  aggregates?: GroupAggregatesFn<TRow>;
  /** Override blank-group label (default `"(blank)"`). */
  blankLabel?: string;
}

/**
 * Resolve the value used to bucket a row for `groupBy`. Prefers the column's
 * `sortValue` (same primitive as client sort), then a path lookup on the
 * column key — never the JSX accessor.
 */
export function resolveGroupValue<TRow>(
  row: TRow,
  groupBy: string,
  column: ColumnDef<TRow> | undefined
): unknown {
  if (column?.sortValue) return column.sortValue(row);
  const path = column?.key ?? groupBy;
  return getPath(row, path);
}

/**
 * Stable string key for a group bucket. Type-tagged so distinct values
 * never share a bucket across types — number `5` vs string `"5"`, boolean
 * `true` vs string `"true"`, a Date vs its own ISO string. Null-ish and
 * empty-string values deliberately share the one blank bucket (they all
 * render the same blank label; splitting them would show several
 * identical "(blank)" groups).
 */
export function groupValueKey(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "number" || typeof value === "bigint") {
    return `n:${String(value)}`;
  }
  if (typeof value === "boolean") return `b:${String(value)}`;
  if (value instanceof Date) return `d:${value.toISOString()}`;
  try {
    return `j:${JSON.stringify(value)}`;
  } catch {
    return `o:${Object.prototype.toString.call(value)}`;
  }
}

export function formatGroupLabel(
  value: unknown,
  blankLabel = "(blank)"
): string {
  if (value == null || value === "") return blankLabel;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

export function makeGroupRowKey(groupBy: string, valueKey: string): string {
  return `group:${groupBy}:${valueKey}`;
}

/**
 * Partition leaf rows into a single-level flat model: group header, then its
 * leaves (omitted when collapsed). Group order follows first-seen value order
 * in `rows` (already filtered/sorted by the source).
 */
export function buildGroupedFlatModel<TRow>(
  options: BuildGroupedFlatModelOptions<TRow>
): GroupedFlatEntry<TRow>[] {
  const {
    rows,
    groupBy,
    columns,
    getRowId,
    collapsedIds,
    aggregates,
    blankLabel,
  } = options;
  const column = columns.find((c) => c.key === groupBy);

  interface Bucket {
    value: unknown;
    valueKey: string;
    leafRows: TRow[];
  }
  const order: string[] = [];
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const value = resolveGroupValue(row, groupBy, column);
    const valueKey = groupValueKey(value);
    let bucket = buckets.get(valueKey);
    if (!bucket) {
      bucket = { value, valueKey, leafRows: [] };
      buckets.set(valueKey, bucket);
      order.push(valueKey);
    }
    bucket.leafRows.push(row);
  }

  const flat: GroupedFlatEntry<TRow>[] = [];
  let leafIndex = 0;

  for (const valueKey of order) {
    const bucket = buckets.get(valueKey)!;
    const groupKey = makeGroupRowKey(groupBy, valueKey);
    const collapsed = collapsedIds.has(groupKey);
    const leafIds = bucket.leafRows.map((row) => getRowId(row));
    const aggregateCells = aggregates?.(bucket.leafRows);

    flat.push({
      kind: "group",
      key: groupKey,
      value: bucket.value,
      label: formatGroupLabel(bucket.value, blankLabel),
      leafRows: bucket.leafRows,
      leafIds,
      aggregateCells,
      collapsed,
    });

    if (!collapsed) {
      for (const row of bucket.leafRows) {
        flat.push({
          kind: "row",
          key: getRowId(row),
          row,
          index: leafIndex++,
          groupKey,
        });
      }
    }
  }

  return flat;
}
