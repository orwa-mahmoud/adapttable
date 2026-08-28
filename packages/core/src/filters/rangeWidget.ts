import type { ExtraFilters, FilterValue } from "../types";
import {
  DATE_OP_LABEL_KEYS,
  type DateOp,
  filterOpKey,
  isListFilterOp,
  isValuelessFilterOp,
  NUMBER_OP_LABEL_KEYS,
  type NumberOp,
  parseDateOp,
  parseListOperand,
  parseNumberOp,
} from "./operators";
import { isRelativeDateToken } from "./relativeDates";

/**
 * Historical four-operator set. New code should use {@link NUMBER_OPS} /
 * {@link DATE_OPS}; this list stays exported so existing imports keep
 * type-checking while the widgets read the flavour-specific lists.
 *
 * @internal
 */
export const RANGE_OPS = ["eq", "gte", "lte", "between"] as const;

/**
 * One range-widget comparison operator (number or date).
 *
 * @public
 */
export type RangeOp = NumberOp | DateOp;

/**
 * The widget's view of a range: an operator plus its bound(s).
 *
 * @internal
 */
export interface RangeWidgetState {
  /** Selected comparison, or `undefined` while nothing is chosen. */
  op: RangeOp | undefined;
  /** The single value, the lower bound (`between`), or the list text. */
  a: string;
  /** The upper bound (`between` only). */
  b: string;
}

const text = (value: FilterValue | undefined): string =>
  value == null ? "" : String(value);

const asOpValue = (raw: string): FilterValue => (raw === "" ? undefined : raw);

function readStoredRangeOp(
  extra: ExtraFilters,
  stored: RangeOp,
  lowKey: string,
  highKey: string,
  listKey?: string
): RangeWidgetState {
  if (stored === "in" || stored === "notIn") {
    return {
      op: stored,
      a: parseListOperand(listKey ? extra[listKey] : undefined).join(", "),
      b: "",
    };
  }
  if (stored === "empty") {
    return { op: stored, a: "", b: "" };
  }
  const low = text(extra[lowKey]);
  const high = text(extra[highKey]);
  if (stored === "lte" || stored === "lt" || stored === "before") {
    return { op: stored, a: high || low, b: "" };
  }
  if (stored === "between") {
    return { op: stored, a: low, b: high };
  }
  return { op: stored, a: low || high, b: "" };
}

function inferRangeFromPair(
  extra: ExtraFilters,
  lowKey: string,
  highKey: string,
  flavour?: "number" | "date"
): RangeWidgetState {
  const low = text(extra[lowKey]);
  const high = text(extra[highKey]);
  if (low !== "" && high !== "") {
    return low === high
      ? { op: flavour === "date" ? "on" : "eq", a: low, b: "" }
      : { op: "between", a: low, b: high };
  }
  if (low !== "" && flavour === "date" && isRelativeDateToken(low)) {
    return { op: "relative", a: low, b: "" };
  }
  if (low !== "") return { op: "gte", a: low, b: "" };
  if (high !== "") return { op: "lte", a: high, b: "" };
  return { op: undefined, a: "", b: "" };
}

/**
 * Derive the widget state. A stored `f_<key>Op` wins; without it the
 * inclusive pair still infers `eq` / `gte` / `lte` / `between` so links
 * written before operators were persisted keep opening on the right
 * comparison.
 *
 * @internal
 */
export function readRangeWidget(
  extra: ExtraFilters,
  lowKey: string,
  highKey: string,
  opKey?: string,
  listKey?: string,
  flavour?: "number" | "date"
): RangeWidgetState {
  const stored = opKey
    ? (parseNumberOp(extra[opKey]) ?? parseDateOp(extra[opKey]))
    : undefined;
  if (stored) {
    return readStoredRangeOp(extra, stored, lowKey, highKey, listKey);
  }
  return inferRangeFromPair(extra, lowKey, highKey, flavour);
}

/**
 * Convert a widget interaction back to the persisted pair. Empty values
 * clear their keys, so half-filled widgets never leak stale bounds.
 *
 * @internal
 */
export function writeRangeWidget(
  op: RangeOp | undefined,
  a: string,
  b: string,
  lowKey: string,
  highKey: string
): ExtraFilters {
  switch (op) {
    case "eq":
    case "on":
      return { [lowKey]: asOpValue(a), [highKey]: asOpValue(a) };
    case "gte":
    case "gt":
    case "after":
    case "neq":
    case "relative":
      return { [lowKey]: asOpValue(a), [highKey]: undefined };
    case "lte":
    case "lt":
    case "before":
      return { [lowKey]: undefined, [highKey]: asOpValue(a) };
    case "between":
      return { [lowKey]: asOpValue(a), [highKey]: asOpValue(b) };
    default:
      return { [lowKey]: undefined, [highKey]: undefined };
  }
}

/**
 * Persist an operator-first range (or list) filter: the inclusive pair,
 * the list key for `in` / `notIn`, and the readable `f_<key>Op` token.
 *
 * @internal
 */
export function writeRangeFilter(
  op: RangeOp | undefined,
  a: string,
  b: string,
  lowKey: string,
  highKey: string,
  key: string
): ExtraFilters {
  const opKey = filterOpKey(key);
  if (!op) {
    return {
      ...writeRangeWidget(undefined, "", "", lowKey, highKey),
      [opKey]: undefined,
    };
  }
  if (isValuelessFilterOp(op)) {
    return {
      ...writeRangeWidget(undefined, "", "", lowKey, highKey),
      [key]: undefined,
      [opKey]: op,
    };
  }
  if (isListFilterOp(op)) {
    const entries = parseListOperand(a);
    return {
      ...writeRangeWidget(undefined, "", "", lowKey, highKey),
      [key]: entries.length > 0 ? entries : undefined,
      [opKey]: entries.length > 0 ? op : undefined,
    };
  }
  const pair = writeRangeWidget(op, a, b, lowKey, highKey);
  const active = a !== "" || (op === "between" && b !== "");
  return {
    ...pair,
    [opKey]: active ? op : undefined,
  };
}

/**
 * Label keys for each operator, per widget flavour (numbers vs dates).
 *
 * @internal
 */
export const RANGE_OP_LABEL_KEYS = {
  number: NUMBER_OP_LABEL_KEYS,
  /** `eq` stays as the historical spelling of `on` for existing widgets. */
  date: { ...DATE_OP_LABEL_KEYS, eq: "opOn" },
} as const;
