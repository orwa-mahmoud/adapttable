/**
 * The reader's group aggregation choices in the `groupAgg` URL parameter.
 *
 * Kept apart from the aggregation model so a backend reads the parameter
 * through `@adapttable/core/query` without loading the aggregates.
 */
import type { AggregateOperationId } from "../contracts/columns";
import { safeDecode } from "../utils/safeDecode";

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
    const key = safeDecode(entry.slice(0, separator));
    const fn = safeDecode(entry.slice(separator + 1));
    if (!isOverride(fn) || key === "") continue;
    overrides[key] ??= fn;
  }
  return overrides;
}
