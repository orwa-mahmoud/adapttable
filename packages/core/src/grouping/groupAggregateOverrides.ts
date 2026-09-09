import {
  type AggregationSourceSupport,
  allowsReaderOperation,
  resolveAggregatable,
} from "../aggregate/aggregatable";
import {
  aggregate,
  AGGREGATE_NAMES,
  type AggregateName,
  type AggregateOperationId,
  type AggregateSpec,
} from "../aggregate/aggregate";
import type { ColumnMetadata } from "../columnModel";
import type { DisplayValue } from "../display";
import type { QueryAggregate } from "../source/queryContract";
import type { GroupAggregateOps } from "./groupRowLayout";
import type { GroupAggregatesFn } from "./groupRows";

/**
 * A session-level aggregation choice for one grouped-table column.
 *
 * A built-in name, a host operation's own id, or `"none"` — the reader having
 * taken the column's aggregate away. Built-ins still autocomplete; the open
 * half is what lets a column's own `{ id, label, calculate }` operation
 * survive a URL and a saved view.
 *
 * @public
 */
export type GroupAggregateOverride = AggregateOperationId | "none";

/**
 * Session-level aggregation choices keyed by column.
 *
 * An absent key preserves the developer's `groupAggregates` result. `"none"`
 * explicitly hides that column's aggregate.
 *
 * @public
 */
export type GroupAggregateOverrides = Readonly<
  Partial<Record<string, GroupAggregateOverride>>
>;

/**
 * Whether a serialized value can be an operation id at all.
 *
 * Syntax only. Which ids a column actually allows is a question about that
 * column, answered by `reconcileAggregations` once the columns are known —
 * a parser that rejected everything it did not recognize would drop every
 * host-defined operation on the way back from a URL.
 */
function isOverride(value: string): value is GroupAggregateOverride {
  return value !== "" && !value.includes(",");
}

/**
 * Encode aggregate overrides for the `groupAgg` URL parameter.
 *
 * Keys are sorted so equivalent state has one stable URL representation.
 *
 * @public
 */
export function serializeGroupAggregateOverrides(
  overrides: GroupAggregateOverrides
): string | undefined {
  const entries = Object.entries(overrides)
    .filter(
      (entry): entry is [string, GroupAggregateOverride] =>
        entry[0] !== "" && entry[1] !== undefined && isOverride(entry[1])
    )
    .sort(([left], [right]) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
  if (entries.length === 0) return undefined;
  return entries
    .map(([key, fn]) => `${encodeURIComponent(key)}:${fn}`)
    .join(",");
}

/**
 * Decode a `groupAgg` URL parameter. Malformed and unknown entries are
 * ignored so hand-edited and future-version links degrade safely.
 *
 * @public
 */
export function parseGroupAggregateOverrides(
  value: string | null | undefined
): GroupAggregateOverrides {
  if (!value) return {};
  const overrides: Record<string, GroupAggregateOverride> = {};
  for (const entry of value.split(",")) {
    const separator = entry.lastIndexOf(":");
    if (separator <= 0) continue;
    const rawKey = entry.slice(0, separator);
    const fn = entry.slice(separator + 1);
    if (!isOverride(fn)) continue;
    let key = rawKey;
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      // A malformed escape still names a literal key.
    }
    if (key !== "" && overrides[key] === undefined) overrides[key] = fn;
  }
  return overrides;
}

/**
 * Overlay session choices on the developer's group aggregate mapper.
 *
 * @public
 */
export function withGroupAggregateOverrides<TRow>(
  base: GroupAggregatesFn<TRow> | undefined,
  overrides: GroupAggregateOverrides,
  columns: readonly ColumnMetadata<TRow>[],
  source?: AggregationSourceSupport
): GroupAggregatesFn<TRow> | undefined {
  const entries = Object.entries(overrides).filter(
    (entry): entry is [string, GroupAggregateOverride] => entry[1] !== undefined
  );
  if (entries.length === 0) return base;

  const byKey = new Map(columns.map((column) => [column.key, column]));
  const spec: AggregateSpec = {};
  const applied = new Set<string>();
  for (const [key, fn] of entries) {
    if (fn === "none") continue;
    const column = byKey.get(key);
    const resolved = resolveAggregatable(column ?? { key });
    // A stale URL or a programmatic write must not calculate something the
    // column never offered. Leave the host's own cell alone.
    if (!allowsReaderOperation(resolved, fn, source)) continue;
    const operation = resolved?.operations.find(
      (candidate) => candidate.id === fn
    );
    if (!operation) continue;
    if (!operation.builtIn) {
      if (!operation.calculate) continue;
      spec[key] = operation.calculate;
      applied.add(key);
      continue;
    }
    spec[key] = fn as AggregateName;
    applied.add(key);
  }
  const calculate = aggregate<TRow>(spec, { columns });
  return (rows) => {
    const result: Partial<Record<string, DisplayValue>> = { ...base?.(rows) };
    const calculated = calculate(rows);
    for (const [key, fn] of entries) {
      if (fn === "none") delete result[key];
      else if (applied.has(key)) result[key] = calculated[key];
    }
    return result;
  };
}

/**
 * Which operation each aggregate a server was asked for carries.
 *
 * The request already says it — `{ key: "budget", fn: "avg" }` — so a column
 * formatting a server's answer is told the same thing it would be told about
 * one computed in the browser. A name the built-ins do not cover is a host
 * operation's own id, and it travels unchanged: the column declared it, so
 * `formatAggregate` is told exactly what the server was asked for.
 *
 * @param aggregates - The aggregates the request carried, if any.
 * @returns The operations by column key.
 *
 * @public
 */
export function queryAggregateOps(
  aggregates: readonly QueryAggregate[] | undefined
): GroupAggregateOps | undefined {
  if (!aggregates || aggregates.length === 0) return undefined;
  const ops: Record<string, string> = {};
  for (const entry of aggregates) {
    if (entry.fn !== "") ops[entry.key] = entry.fn;
  }
  return Object.keys(ops).length > 0 ? ops : undefined;
}

/**
 * Overlay URL choices on the aggregate requests sent to a server source.
 *
 * @public
 */
export function withQueryAggregateOverrides<TRow = unknown>(
  base: readonly QueryAggregate[] | undefined,
  overrides: GroupAggregateOverrides,
  columns?: readonly ColumnMetadata<TRow>[],
  source?: AggregationSourceSupport
): readonly QueryAggregate[] | undefined {
  const byKey = new Map(base?.map((aggregate) => [aggregate.key, aggregate]));
  const byColumn = new Map(columns?.map((column) => [column.key, column]));
  for (const [key, fn] of Object.entries(overrides)) {
    if (fn === undefined || fn === "none") {
      byKey.delete(key);
      continue;
    }
    if (columns) {
      const resolved = resolveAggregatable(byColumn.get(key) ?? { key });
      if (!allowsReaderOperation(resolved, fn, source)) continue;
    } else if (!querySourceAllows(fn, source)) {
      continue;
    }
    byKey.set(key, { key, fn });
  }
  return byKey.size > 0 ? [...byKey.values()] : undefined;
}

/**
 * Whether a request may carry this id when the columns are not known yet.
 *
 * A listed backend is the allowlist. Without a list, only the five standard
 * names travel — a local `calculate` is not proof the server knows the id.
 */
function querySourceAllows(
  operationId: string,
  source: AggregationSourceSupport | undefined
): boolean {
  if (source?.grouping !== "server") return true;
  const listed = source.aggregateOperations;
  if (listed) return listed.includes(operationId);
  return (AGGREGATE_NAMES as readonly string[]).includes(operationId);
}
