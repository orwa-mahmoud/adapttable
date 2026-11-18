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
import type {
  AggregateName,
  AggregateOperationId,
  AggregateOrderedValue,
  Aggregator,
  ColumnMetadata,
} from "../contracts/columns";
import type { DisplayValue } from "../display";
import {
  currentFeatureHost,
  type FeatureHostState,
} from "../features/currentHost";
import { getPath } from "../utils/path";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOrderedValue,
  Aggregator,
} from "../contracts/columns";

/**
 * What to compute per column: a built-in name, a name registered with
 * `registerAggregator`, or your own function.
 *
 * @public
 */
export type AggregateSpec = Partial<
  Record<string, AggregateOperationId | Aggregator>
>;

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
/** Strict ISO clock: `HH:mm` with optional seconds and a fraction. */
const ISO_CLOCK = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;
/** Strict ISO timezone: `Z`, `+HH:MM`, or `+HHMM`. */
const ISO_TZ = /^(Z|[+-]\d{2}:?\d{2})$/;

function finiteMs(time: number): number | undefined {
  return Number.isFinite(time) ? time : undefined;
}

/** Milliseconds from midnight for a time-only ISO clock. */
function instantFromClock(text: string): number | undefined {
  const match = ISO_CLOCK.exec(text);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  const fraction = match[4] === undefined ? 0 : Number(`0.${match[4]}`);
  return finiteMs(
    hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + fraction * 1000
  );
}

/** Split `HH:mm[:ss][.frac][Z|+offset]` into the clock and its zone. */
function peelTimeZone(rest: string): { clock: string; zone: string } {
  if (rest.endsWith("Z")) {
    return { clock: rest.slice(0, -1), zone: "Z" };
  }
  const plus = rest.lastIndexOf("+");
  if (plus > 0 && ISO_TZ.test(rest.slice(plus))) {
    return { clock: rest.slice(0, plus), zone: rest.slice(plus) };
  }
  const minus = rest.lastIndexOf("-");
  if (minus > 0 && ISO_TZ.test(rest.slice(minus))) {
    return { clock: rest.slice(0, minus), zone: rest.slice(minus) };
  }
  return { clock: rest, zone: "" };
}

/**
 * Parse `YYYY-MM-DD[T ]HH:mm…` the same way `Date.parse` would, after the
 * date, clock and optional zone have each been checked on their own.
 */
function instantFromDateTime(text: string): number | undefined {
  const sep = text.includes("T") ? text.indexOf("T") : text.indexOf(" ");
  if (sep < 0) return undefined;
  if (!ISO_DATE.test(text.slice(0, sep))) return undefined;
  const { clock } = peelTimeZone(text.slice(sep + 1));
  if (!ISO_CLOCK.test(clock)) return undefined;
  return finiteMs(Date.parse(text));
}

function instantFromIsoString(text: string): number | undefined {
  if (ISO_DATE.test(text)) {
    return finiteMs(Date.parse(`${text}T00:00:00Z`));
  }
  return instantFromDateTime(text) ?? instantFromClock(text);
}

/**
 * Parse a temporal value the built-in min/max can compare.
 *
 * Accepts a `Date`, a finite number (including an epoch), a numeric string,
 * or a strict ISO date / datetime / time string. Locale-dependent forms
 * (`"9 Sep 2026"`, `"09/09/2026"`) are invalid and skipped — the same way a
 * non-numeric string is skipped by `toAggregateNumber`.
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
    return finiteMs(value.getTime());
  }
  if (typeof value === "string") {
    const fromIso = instantFromIsoString(value.trim());
    if (fromIso !== undefined) return fromIso;
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

/**
 * One built-in's running state for a single column: it sees each present
 * value once, in row order, and answers when the rows are done.
 */
interface BuiltInFold {
  step(value: AggregateOrderedValue): void;
  result(): AggregateOrderedValue | undefined;
}

/** Sum and count the summable values; anything else is silently skipped. */
function numericFold(
  answer: (total: number, count: number) => number | undefined
): BuiltInFold {
  let total = 0;
  let count = 0;
  return {
    step(value) {
      const n = toAggregateNumber(value);
      if (n === undefined) return;
      total += n;
      count += 1;
    },
    result: () => answer(total, count),
  };
}

/** The first value of lowest or highest rank, as the original value. */
function extremeFold(which: "min" | "max"): BuiltInFold {
  let best: { rank: number; result: AggregateOrderedValue } | undefined;
  return {
    step(value) {
      const ordered = toAggregateOrdered(value);
      if (!ordered) return;
      if (
        !best ||
        (which === "min" ? ordered.rank < best.rank : ordered.rank > best.rank)
      ) {
        best = ordered;
      }
    },
    result: () => best?.result,
  };
}

/**
 * The built-ins, each a fold over the present values, so a total never
 * builds a list of the column's values first.
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
const BUILT_INS: Record<AggregateName, () => BuiltInFold> = {
  sum: () => numericFold((total) => total),
  avg: () => numericFold((total, count) => (count ? total / count : undefined)),
  count: () => {
    let count = 0;
    return {
      step() {
        count += 1;
      },
      result: () => count,
    };
  },
  min: () => extremeFold("min"),
  max: () => extremeFold("max"),
};

/**
 * Every built-in aggregate name, for a UI that offers a choice.
 *
 * @public
 */
export const AGGREGATE_NAMES = /* @__PURE__ */ Object.keys(
  BUILT_INS
) as AggregateName[];

/** Whether an id is one of the built-in names. */
function isAggregateName(id: string): id is AggregateName {
  return (AGGREGATE_NAMES as readonly string[]).includes(id);
}

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
  const value: AggregateOrderedValue = column?.sortValue
    ? column.sortValue(row)
    : (getPath(row, key) as AggregateOrderedValue);
  return value;
}

/** A built-in's answer for one column, folding the rows directly. */
function folded<TRow>(
  fold: BuiltInFold,
  rows: readonly TRow[],
  key: string,
  column: ColumnMetadata<TRow> | undefined
): DisplayValue | undefined {
  for (const row of rows) {
    const value = resolveAggregateValue(row, key, column);
    // A missing value is not a zero: the fold sees only what is really there.
    if (value !== undefined && value !== null) fold.step(value);
  }
  return fold.result();
}

/** How one column is computed from the rows it is handed. */
type ColumnOperation<TRow> = (
  rows: readonly TRow[],
  key: string,
  column: ColumnMetadata<TRow> | undefined
) => DisplayValue | undefined;

/**
 * The operation a declaration names: a built-in folds the rows directly, a
 * registered or passed aggregator receives the present values as a list,
 * and an id that names nothing leaves the column out.
 */
function columnOperation<TRow>(
  fn: AggregateOperationId | Aggregator,
  boundHost: FeatureHostState | undefined
): ColumnOperation<TRow> | undefined {
  if (typeof fn === "string" && isAggregateName(fn)) {
    return (rows, key, column) => folded(BUILT_INS[fn](), rows, key, column);
  }
  const aggregator =
    typeof fn === "string"
      ? (boundHost ?? currentFeatureHost())?.aggregators.get(fn)
      : fn;
  if (typeof aggregator !== "function") return undefined;
  return (rows, key, column) => collected(aggregator, rows, key, column);
}

/** A custom aggregator's input: the present values, in row order. */
function collected<TRow>(
  aggregator: Aggregator,
  rows: readonly TRow[],
  key: string,
  column: ColumnMetadata<TRow> | undefined
): DisplayValue | undefined {
  const values: AggregateOrderedValue[] = [];
  for (const row of rows) {
    const value = resolveAggregateValue(row, key, column);
    // A missing value is not a zero — skip it and let the aggregator see
    // only what is really there.
    if (value !== undefined && value !== null) values.push(value);
  }
  return aggregator(values);
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
      const operation = columnOperation(fn, boundHost);
      if (!operation) continue;
      const result = operation(rows, key, byKey.get(key));
      out[key] = format ? format(result, key) : result;
    }
    return out;
  };
  return withDeclaredAggregates(mapper, declaredFrom(spec));
}

/**
 * What a mapper built by `aggregate()` was declared to compute.
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
const DECLARED = /* @__PURE__ */ Symbol.for("adapttable.declaredAggregates");

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
 * Read what a mapper declares, when it came from `aggregate()`.
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
