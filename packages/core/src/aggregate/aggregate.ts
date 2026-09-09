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
import type { ColumnMetadata } from "../columnModel";
import type { DisplayValue } from "../display";
import {
  currentFeatureHost,
  type FeatureHostState,
} from "../features/currentHost";
import type { SortableValue } from "../types";
import { getPath } from "../utils/path";

/**
 * A value min/max can rank: the sortable primitives plus a `Date`.
 *
 * `SortableValue` stays the sort-key type. A date column's raw cell is a
 * `Date` without a `sortValue`, and min/max keep that original rather than
 * forcing it through a number first.
 *
 * @public
 */
export type AggregateOrderedValue = SortableValue | Date;

/**
 * The aggregate functions available by name.
 *
 * @public
 */
export type AggregateName = "sum" | "avg" | "count" | "min" | "max";

/**
 * An operation id: a built-in name, or one a column declared itself.
 *
 * The open half is what carries a host's `{ id, label, calculate }` operation
 * through state, a URL and a request; the named half is what keeps built-ins
 * autocompleting.
 *
 * @public
 */
export type AggregateOperationId =
  AggregateName | (string & Record<never, never>);

/**
 * A custom aggregator: the values found for one column across the rows being
 * aggregated, already narrowed to those that are present.
 *
 * Return whatever the cell should show — a number, a formatted string, a
 * node. Return `undefined` for "no cell here".
 *
 * The return type is `DisplayValue` so the built mapper is directly assignable
 * to `summaryRow` and `groupAggregates`, which is the whole point of it.
 *
 * @public
 */
export type Aggregator<TValue = AggregateOrderedValue> = (
  values: readonly TValue[]
) => DisplayValue | undefined;

/**
 * What the table knows about the aggregate a column is about to show.
 *
 * @public
 */
export interface AggregateFormatContext {
  /** The column the value belongs to. */
  readonly columnKey: string;
  /**
   * The operation that produced it, when the table knows: the reader's own
   * choice, or the one a server was asked for — a built-in name, or the id of
   * an operation the column declared itself. A hand-written `groupAggregates`
   * mapper declares nothing, so this is absent there.
   */
  readonly aggregation?: AggregateOperationId;
}

/**
 * What to compute per column: a built-in name, or your own function.
 *
 * @public
 */
export type AggregateSpec = Partial<Record<string, AggregateName | Aggregator>>;

/**
 * Options for `aggregate`.
 *
 * @public
 */
export interface AggregateOptions<TRow> {
  /**
   * Columns, so values resolve through `sortValue` exactly as sorting and
   * grouping do. Without them, values come from the key's data path.
   */
  columns?: readonly ColumnMetadata<TRow>[];
  /**
   * Format a computed value for display. Receives the raw result and the
   * column key: `format: (v, key) => key === "budget" ? money.format(v) : v`.
   *
   * This runs when the value is computed. A column's `formatAggregate` runs
   * when a group cell is drawn, and the two compose: with both set, the
   * column is handed what this returned and formats it again unless it is
   * written to pass non-numbers through. For groups, leaving the value raw
   * here and letting the column own presentation is the simpler pair; for a
   * mapper used as `summaryRow`, this is the only one of the two that runs.
   */
  format?: (
    value: DisplayValue | undefined,
    key: string
  ) => DisplayValue | undefined;
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
export function toAggregateNumber(
  value: AggregateOrderedValue
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Strict ISO date: `YYYY-MM-DD`. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Strict ISO datetime, optional seconds/fraction and a timezone. */
const ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/;
/** Strict ISO time: `HH:mm` with optional seconds. */
const ISO_TIME = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;

/**
 * Parse a temporal value the built-in min/max can compare.
 *
 * Accepts a `Date`, a finite number (including an epoch), a numeric string,
 * or a strict ISO date / datetime / time string. Locale-dependent forms
 * (`"9 Sep 2026"`, `"09/09/2026"`) are invalid and skipped — the same way a
 * non-numeric string is skipped by {@link toAggregateNumber}.
 *
 * @param value - The resolved cell value, already through `sortValue` when
 *   the column has one.
 * @returns Milliseconds from epoch (or from midnight for a time-only string),
 *   or `undefined` when the value is missing or not a supported temporal.
 *
 * @public
 */
export function toAggregateInstant(
  value: AggregateOrderedValue
): number | undefined {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : undefined;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (ISO_DATE.test(text)) {
      const time = Date.parse(`${text}T00:00:00Z`);
      return Number.isFinite(time) ? time : undefined;
    }
    if (ISO_DATETIME.test(text)) {
      const time = Date.parse(text);
      return Number.isFinite(time) ? time : undefined;
    }
    if (ISO_TIME.test(text)) {
      const match = ISO_TIME.exec(text);
      if (!match) return undefined;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = match[3] === undefined ? 0 : Number(match[3]);
      const fraction = match[4] === undefined ? 0 : Number(`0.${match[4]}`);
      const time =
        hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + fraction * 1000;
      return Number.isFinite(time) ? time : undefined;
    }
  }
  return toAggregateNumber(value);
}

/**
 * One comparable value for min/max: a rank plus the original cell to return.
 *
 * Numeric values keep returning a number. A `Date` stays a `Date`. An ISO
 * string stays that string, so `formatAggregate` can format it as a date
 * without guessing. Invalid and missing values are absent.
 *
 * @param value - The resolved cell value.
 * @returns The rank and the result representation, or `undefined` to skip.
 *
 * @public
 */
export function toAggregateOrdered(
  value: AggregateOrderedValue
): { rank: number; result: AggregateOrderedValue } | undefined {
  if (value instanceof Date) {
    const rank = toAggregateInstant(value);
    return rank === undefined ? undefined : { rank, result: value };
  }
  const numeric = toAggregateNumber(value);
  if (numeric !== undefined) return { rank: numeric, result: numeric };
  if (typeof value === "string") {
    const rank = toAggregateInstant(value);
    if (rank !== undefined) return { rank, result: value };
  }
  return undefined;
}

/** Numbers only — everything else is not summable, and silently skipped. */
function numbers(values: readonly AggregateOrderedValue[]): number[] {
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
 *
 * `min` and `max` compare through {@link toAggregateOrdered}: numbers stay
 * numbers; a `Date` or a strict ISO date/time string stays that value, so
 * `formatAggregate` receives the winning original rather than a timestamp.
 * Locale-dependent date strings are skipped, not guessed.
 */
const BUILT_INS: Record<AggregateName, Aggregator> = {
  sum: (values) => numbers(values).reduce((a, b) => a + b, 0),
  avg: (values) => {
    const ns = numbers(values);
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : undefined;
  },
  count: (values) => values.length,
  min: (values) => extreme(values, "min"),
  max: (values) => extreme(values, "max"),
};

function extreme(
  values: readonly AggregateOrderedValue[],
  which: "min" | "max"
): AggregateOrderedValue | undefined {
  let best: { rank: number; result: AggregateOrderedValue } | undefined;
  for (const value of values) {
    const ordered = toAggregateOrdered(value);
    if (!ordered) continue;
    if (
      !best ||
      (which === "min" ? ordered.rank < best.rank : ordered.rank > best.rank)
    ) {
      best = ordered;
    }
  }
  return best?.result;
}

/**
 * Every built-in aggregate name, for a UI that offers a choice.
 *
 * @public
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
  column: ColumnMetadata<TRow> | undefined
): AggregateOrderedValue {
  if (column?.sortValue) return column.sortValue(row);
  return getPath(row, key) as AggregateOrderedValue;
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
 * @public
 */
export function aggregate<TRow>(
  spec: AggregateSpec,
  options: AggregateOptions<TRow> = {}
): GroupAggregatesMapper<TRow> {
  const { columns, format, host: boundHost } = options;
  const byKey = new Map(columns?.map((c) => [c.key, c]));
  const entries = Object.entries(spec);

  const mapper = (rows: readonly TRow[]) => {
    const out: Partial<Record<string, DisplayValue>> = {};
    for (const [key, fn] of entries) {
      if (!fn) continue;
      const aggregator =
        typeof fn === "string"
          ? (BUILT_INS[fn] ??
            (boundHost ?? currentFeatureHost())?.aggregators.get(fn))
          : fn;
      if (typeof aggregator !== "function") continue;
      const values: AggregateOrderedValue[] = [];
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
  return withDeclaredAggregates(mapper, declaredFrom(spec));
}

/**
 * What a mapper built by {@link aggregate} was declared to compute.
 *
 * Column key to operation id, and `CUSTOM_AGGREGATE` where the declaration
 * was a function rather than a name. Ids only: a closure is not application
 * state, so nothing here can reach a URL, a saved view or a request body.
 *
 * @public
 */
export type DeclaredAggregates = Readonly<Record<string, string>>;

/**
 * The operation id standing for "the host calculates this itself".
 *
 * A function says what to compute and nothing about which operation it is,
 * so the table reports it as custom rather than inventing a name for it.
 *
 * @public
 */
export const CUSTOM_AGGREGATE = "custom";

/** Where the declaration rides on the mapper, out of reach of JSON. */
const DECLARED = Symbol.for("adapttable.declaredAggregates");

/**
 * A `groupAggregates` / `summaryRow` mapper, optionally carrying what it was
 * declared to compute.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface GroupAggregatesMapper<TRow> {
  (rows: readonly TRow[]): Partial<Record<string, DisplayValue>>;
  /** What this mapper declares, when the table built it. */
  readonly [DECLARED]?: DeclaredAggregates;
}

/** The spec, reduced to the ids a reader-facing surface may show. */
function declaredFrom(spec: AggregateSpec): DeclaredAggregates {
  const out: Record<string, string> = {};
  for (const [key, fn] of Object.entries(spec)) {
    if (!fn) continue;
    out[key] = typeof fn === "string" ? fn : CUSTOM_AGGREGATE;
  }
  return out;
}

/** Attach a declaration to a mapper without making it enumerable state. */
export function withDeclaredAggregates<TRow>(
  mapper: (rows: readonly TRow[]) => Partial<Record<string, DisplayValue>>,
  declared: DeclaredAggregates
): GroupAggregatesMapper<TRow> {
  return Object.defineProperty(mapper, DECLARED, {
    value: declared,
    enumerable: false,
  });
}

/**
 * Read what a mapper declares, when it came from {@link aggregate}.
 *
 * The table asks this instead of running the mapper on invented rows: a
 * hand-written mapper answers nothing, which is the honest answer, and a
 * declared one names the columns and operations it owns.
 *
 * @param mapper - Any `groupAggregates` / `summaryRow` value.
 * @returns The declaration, or `undefined` for a mapper the table did not build.
 *
 * @public
 */
export function declaredAggregates(
  mapper: unknown
): DeclaredAggregates | undefined {
  if (typeof mapper !== "function") return undefined;
  return (mapper as GroupAggregatesMapper<never>)[DECLARED];
}
