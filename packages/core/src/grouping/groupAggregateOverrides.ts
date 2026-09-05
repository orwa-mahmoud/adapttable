import {
  aggregate,
  AGGREGATE_NAMES,
  type AggregateName,
} from "../aggregate/aggregate";
import type { ColumnMetadata } from "../columnModel";
import type { DisplayValue } from "../display";
import type { QueryAggregate } from "../source/queryContract";
import type { GroupAggregatesFn } from "./groupRows";

/** A session-level aggregation choice for one grouped-table column. @public */
export type GroupAggregateOverride = AggregateName | "none";

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

const OVERRIDE_NAMES = new Set<string>([...AGGREGATE_NAMES, "none"]);

function isOverride(value: string): value is GroupAggregateOverride {
  return OVERRIDE_NAMES.has(value);
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
  columns: readonly ColumnMetadata<TRow>[]
): GroupAggregatesFn<TRow> | undefined {
  const entries = Object.entries(overrides).filter(
    (entry): entry is [string, GroupAggregateOverride] => entry[1] !== undefined
  );
  if (entries.length === 0) return base;

  const spec: Partial<Record<string, AggregateName>> = {};
  for (const [key, fn] of entries) {
    if (fn !== "none") spec[key] = fn;
  }
  const calculate = aggregate<TRow>(spec, { columns });
  return (rows) => {
    const result: Partial<Record<string, DisplayValue>> = { ...base?.(rows) };
    const calculated = calculate(rows);
    for (const [key, fn] of entries) {
      if (fn === "none") delete result[key];
      else result[key] = calculated[key];
    }
    return result;
  };
}

/**
 * Overlay URL choices on the aggregate requests sent to a server source.
 *
 * @public
 */
export function withQueryAggregateOverrides(
  base: readonly QueryAggregate[] | undefined,
  overrides: GroupAggregateOverrides
): readonly QueryAggregate[] | undefined {
  const byKey = new Map(base?.map((aggregate) => [aggregate.key, aggregate]));
  for (const [key, fn] of Object.entries(overrides)) {
    if (fn === undefined || fn === "none") byKey.delete(key);
    else byKey.set(key, { key, fn });
  }
  return byKey.size > 0 ? [...byKey.values()] : undefined;
}
