/**
 * Filter-operator registry. Each built-in type declares the operators it
 * understands; the token written to `f_<key>Op` is the stable URL / Saved
 * Views / query-contract id. Omitting the param keeps the historical
 * default so existing links keep matching.
 */
import type { ExtraFilters, FilterValue, TableLabels } from "../types";

/**
 * Suffix on the filter key that stores the operator token (`name` → `nameOp`).
 *
 * @internal
 */
export const FILTER_OP_SUFFIX = "Op";

/**
 * The extra-bag / `f_` key that holds one definition's operator.
 *
 * @internal
 */
export function filterOpKey(key: string): string {
  return key + FILTER_OP_SUFFIX;
}

/**
 * True when `key` is an operator slot (`nameOp`), not a value slot.
 *
 * @internal
 */
export function isFilterOpKey(key: string): boolean {
  return key.endsWith(FILTER_OP_SUFFIX) && key.length > FILTER_OP_SUFFIX.length;
}

/**
 * Text comparison operators. Default when `f_<key>Op` is absent: `contains`.
 *
 * @public
 */
export const TEXT_OPS = [
  "eq",
  "neq",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "empty",
  "notEmpty",
] as const;

/**
 * Number comparison operators. Absent `Op` infers from the Min/Max pair.
 *
 * @public
 */
export const NUMBER_OPS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
  "notIn",
] as const;

/**
 * Date comparison operators. `on` / `gte` / `lte` keep the inclusive-day
 * behaviour existing links already encode; `before` / `after` are exclusive.
 *
 * @public
 */
export const DATE_OPS = [
  "before",
  "after",
  "on",
  "gte",
  "lte",
  "between",
  "relative",
  "empty",
] as const;

/**
 * One text operator token.
 *
 * @public
 */
export type TextOp = (typeof TEXT_OPS)[number];
/**
 * One number operator token.
 *
 * @public
 */
export type NumberOp = (typeof NUMBER_OPS)[number];
/**
 * One date operator token.
 *
 * @public
 */
export type DateOp = (typeof DATE_OPS)[number];
/**
 * Any built-in operator token.
 *
 * @internal
 */
export type FilterOp = TextOp | NumberOp | DateOp;

const TEXT_OP_SET = new Set<string>(TEXT_OPS);
const NUMBER_OP_SET = new Set<string>(NUMBER_OPS);
const DATE_OP_SET = new Set<string>(DATE_OPS);

/**
 * True for operators that take no operand (`empty` / `notEmpty`).
 *
 * @internal
 */
export function isValuelessFilterOp(op: string): boolean {
  return op === "empty" || op === "notEmpty";
}

/**
 * True for operators that take a comma-separated list (`in` / `notIn`).
 *
 * @internal
 */
export function isListFilterOp(op: string): boolean {
  return op === "in" || op === "notIn";
}

/**
 * True for the two-bound `between` operator.
 *
 * @internal
 */
export function isBetweenFilterOp(op: string): boolean {
  return op === "between";
}

/**
 * `TableLabels` key for each text operator (widget + chip wording).
 *
 * @public
 */
export const TEXT_OP_LABEL_KEYS = {
  eq: "opEqual",
  neq: "opNotEqual",
  contains: "opContains",
  notContains: "opNotContains",
  startsWith: "opStartsWith",
  endsWith: "opEndsWith",
  empty: "opEmpty",
  notEmpty: "opNotEmpty",
} as const satisfies Record<TextOp, keyof TableLabels>;

/**
 * `TableLabels` key for each number operator.
 *
 * @public
 */
export const NUMBER_OP_LABEL_KEYS = {
  eq: "opEqual",
  neq: "opNotEqual",
  gt: "opGreater",
  gte: "opAtLeast",
  lt: "opLess",
  lte: "opAtMost",
  between: "opBetween",
  in: "opIn",
  notIn: "opNotIn",
} as const satisfies Record<NumberOp, keyof TableLabels>;

/**
 * `TableLabels` key for each date operator.
 *
 * @public
 */
export const DATE_OP_LABEL_KEYS = {
  before: "opBefore",
  after: "opAfter",
  on: "opOn",
  gte: "opOnOrAfter",
  lte: "opOnOrBefore",
  between: "opBetween",
  relative: "opRelative",
  empty: "opEmpty",
} as const satisfies Record<DateOp, keyof TableLabels>;

/**
 * Parse a text operator; unknown / missing → `contains` (historical default).
 *
 * @internal
 */
export function parseTextOp(raw: FilterValue | undefined): TextOp {
  if (typeof raw === "string" && TEXT_OP_SET.has(raw)) return raw as TextOp;
  return "contains";
}

/**
 * Parse a number operator, or `undefined` when the token is absent/unknown.
 *
 * @internal
 */
export function parseNumberOp(
  raw: FilterValue | undefined
): NumberOp | undefined {
  if (typeof raw === "string" && NUMBER_OP_SET.has(raw)) {
    return raw as NumberOp;
  }
  return undefined;
}

/**
 * Parse a date operator, accepting `eq` as the historical spelling of `on`.
 *
 * @internal
 */
export function parseDateOp(raw: FilterValue | undefined): DateOp | undefined {
  if (raw === "eq") return "on";
  if (typeof raw === "string" && DATE_OP_SET.has(raw)) return raw as DateOp;
  return undefined;
}

/**
 * Read the operator token stored beside a filter key.
 *
 * @internal
 */
export function readFilterOp(
  extra: ExtraFilters,
  key: string
): FilterValue | undefined {
  return extra[filterOpKey(key)];
}

/**
 * True when a row value counts as empty for `empty` / `notEmpty`.
 *
 * @internal
 */
export function isEmptyRowValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return false;
}

/**
 * Split a list operand (`in` / `notIn`) into trimmed, non-empty tokens.
 *
 * @internal
 */
export function parseListOperand(value: FilterValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Parse a list operand as finite numbers (unknown tokens dropped).
 *
 * @internal
 */
export function parseNumberList(value: FilterValue | undefined): number[] {
  const out: number[] = [];
  for (const token of parseListOperand(value)) {
    const n = Number(token);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * Chip text: `Name contains Ada`, or `Name is empty` when there is no
 * operand. The operator word is already localized by the caller.
 *
 * @internal
 */
export function formatFilterChip(
  fieldLabel: string,
  opWord: string,
  value?: string
): string {
  if (value == null || value === "") return `${fieldLabel} ${opWord}`;
  return `${fieldLabel} ${opWord} ${value}`;
}
