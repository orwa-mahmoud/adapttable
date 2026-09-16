import {
  type AggregationSourceSupport,
  resolveAggregatable,
} from "../aggregate/aggregatable";
import {
  aggregate,
  AGGREGATE_NAMES,
  type AggregateName,
  type AggregateOperationId,
  type AggregateSpec,
  CUSTOM_AGGREGATE,
  declaredAggregates,
  withDeclaredAggregates,
} from "../aggregate/aggregate";
import {
  AGGREGATE_SUPPRESSED,
  resolveEffectiveAggregation,
} from "../aggregate/aggregationModel";
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
  return value !== "";
}

/** Encode one key or operation id so `:` and `,` cannot split a pair. */
function encodePart(value: string): string {
  return encodeURIComponent(value);
}

/** Decode one encoded part; a malformed escape stays the literal text. */
function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Encode aggregate overrides for the `groupAgg` URL parameter.
 *
 * Both the column key and the operation id are percent-encoded so a custom
 * id like `stats:median` or `p50,p90` round-trips. Built-in values
 * (`budget:sum`) stay unchanged because they have nothing to escape.
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
    .map(([key, fn]) => `${encodePart(key)}:${encodePart(fn)}`)
    .join(",");
}

/**
 * Decode a `groupAgg` URL parameter. Malformed and unknown entries are
 * ignored so hand-edited and future-version links degrade safely.
 *
 * Splits on the first unencoded `:`. Encoded keys and ids may contain
 * colons, commas, percents, spaces and Unicode; those survive as themselves.
 *
 * @public
 */
export function parseGroupAggregateOverrides(
  value: string | null | undefined
): GroupAggregateOverrides {
  if (!value) return {};
  const overrides: Record<string, GroupAggregateOverride> = {};
  for (const entry of value.split(",")) {
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    const key = decodePart(entry.slice(0, separator));
    const fn = decodePart(entry.slice(separator + 1));
    if (!isOverride(fn) || key === "") continue;
    overrides[key] ??= fn;
  }
  return overrides;
}

/** Overlay one column's effective choice onto the local mapper spec. */
function applyColumnAggregate<TRow>(
  column: ColumnMetadata<TRow>,
  overrides: GroupAggregateOverrides,
  declared: ReturnType<typeof declaredAggregates>,
  source: AggregationSourceSupport | undefined,
  spec: AggregateSpec,
  applied: Set<string>,
  suppressed: Set<string>
): void {
  const effective = resolveEffectiveAggregation({
    column,
    override: overrides[column.key],
    declared,
    source,
  });
  if (effective.kind === "suppressed") {
    suppressed.add(column.key);
    return;
  }
  if (effective.kind !== "override" && effective.kind !== "default") {
    return;
  }
  const operationId = effective.operationId;
  if (!operationId) return;
  const operation = resolveAggregatable(column)?.operations.find(
    (candidate) => candidate.id === operationId
  );
  if (!operation) return;
  if (!operation.builtIn) {
    if (!operation.calculate) return;
    spec[column.key] = operation.calculate;
    applied.add(column.key);
    return;
  }
  spec[column.key] = operationId as AggregateName;
  applied.add(column.key);
}

/**
 * Overlay column defaults and session choices on the developer's group
 * aggregate mapper.
 *
 * Empty overrides still apply a valid, executable column default. Defaults
 * are never written into reader state — the untouched table stays at
 * defaults. `"none"` only removes a cell when the column still allows
 * reader control; a locked or unknown column keeps the host result.
 *
 * @public
 */
export function withGroupAggregateOverrides<TRow>(
  base: GroupAggregatesFn<TRow> | undefined,
  overrides: GroupAggregateOverrides,
  columns: readonly ColumnMetadata<TRow>[],
  source?: AggregationSourceSupport
): GroupAggregatesFn<TRow> | undefined {
  const declared = declaredAggregates(base);
  const spec: AggregateSpec = {};
  const applied = new Set<string>();
  const suppressed = new Set<string>();

  for (const column of columns) {
    applyColumnAggregate(
      column,
      overrides,
      declared,
      source,
      spec,
      applied,
      suppressed
    );
  }

  if (applied.size === 0 && suppressed.size === 0) return base;

  const calculate = aggregate<TRow>(spec, { columns });
  const nextDeclared: Record<string, string> = { ...declared };
  for (const key of suppressed) delete nextDeclared[key];
  for (const [key, fn] of Object.entries(spec)) {
    if (!fn) continue;
    nextDeclared[key] = typeof fn === "string" ? fn : CUSTOM_AGGREGATE;
  }
  const mapper = (rows: readonly TRow[]) => {
    const result: Partial<Record<string, DisplayValue>> = { ...base?.(rows) };
    const calculated = calculate(rows);
    for (const key of suppressed) delete result[key];
    for (const key of applied) result[key] = calculated[key];
    return result;
  };
  return withDeclaredAggregates(mapper, nextDeclared);
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

/** Apply column defaults and reader choices when the columns are known. */
function applyQueryColumnAggregates<TRow>(
  byKey: Map<string, QueryAggregate>,
  columns: readonly ColumnMetadata<TRow>[],
  overrides: GroupAggregateOverrides,
  base: readonly QueryAggregate[] | undefined,
  source?: AggregationSourceSupport
): void {
  for (const column of columns) {
    const effective = resolveEffectiveAggregation({
      column,
      override: overrides[column.key],
      queryAggregates: base,
      source,
    });
    if (effective.kind === "suppressed") {
      byKey.delete(column.key);
      continue;
    }
    if (
      (effective.kind === "override" || effective.kind === "default") &&
      effective.operationId
    ) {
      byKey.set(column.key, {
        key: column.key,
        fn: effective.operationId,
      });
    }
  }
}

/** Apply only reader overrides when the columns have not arrived yet. */
function applyStandaloneQueryOverrides(
  byKey: Map<string, QueryAggregate>,
  overrides: GroupAggregateOverrides,
  source?: AggregationSourceSupport
): void {
  for (const [key, fn] of Object.entries(overrides)) {
    if (fn === undefined) continue;
    if (fn === AGGREGATE_SUPPRESSED) {
      byKey.delete(key);
      continue;
    }
    if (!querySourceAllows(fn, source)) continue;
    byKey.set(key, { key, fn });
  }
}

/**
 * Overlay column defaults and URL choices on the aggregate requests sent
 * to a server source.
 *
 * When `columns` are provided — the built-in table always provides them —
 * a valid executable default is requested even with empty overrides, and
 * `"none"` only removes a host request the reader is still allowed to
 * suppress. An `undefined` override is an absent choice: the base
 * declaration stays.
 *
 * Without `columns`, only reader overrides are applied (the weaker
 * standalone-helper contract). `"none"` still deletes; `undefined` does
 * not. That must not become the normal built-in table path.
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
  if (columns) {
    applyQueryColumnAggregates(byKey, columns, overrides, base, source);
  } else {
    applyStandaloneQueryOverrides(byKey, overrides, source);
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
