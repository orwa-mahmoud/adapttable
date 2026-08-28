import type { ExtraFilters, FilterValue } from "../types";

/**
 * Numeric comparison operators for count/usage filters.
 *
 * @public
 */
export const COUNT_OPERATORS = [
  "eq",
  "gte",
  "lte",
  "gt",
  "lt",
  "between",
] as const;

/**
 * Numeric comparison operator.
 *
 * @public
 */
export type CountOperator = (typeof COUNT_OPERATORS)[number];

/**
 * State for one operator-driven count filter.
 *
 * @public
 */
export interface CountFilterState {
  op?: CountOperator;
  value?: number;
  from?: number;
  to?: number;
}

/**
 * Symbols used in compact chip labels.
 *
 * @public
 */
export const COUNT_OPERATOR_SYMBOL: Record<CountOperator, string> = {
  eq: "=",
  gte: "≥",
  lte: "≤",
  gt: ">",
  lt: "<",
  between: "↔",
};

const OP_SUFFIX = "Op";
const VALUE_SUFFIX = "Value";
const FROM_SUFFIX = "From";
const TO_SUFFIX = "To";

const opKey = (bucket: string) => `${bucket}${OP_SUFFIX}`;
const valueKey = (bucket: string) => `${bucket}${VALUE_SUFFIX}`;
const fromKey = (bucket: string) => `${bucket}${FROM_SUFFIX}`;
const toKey = (bucket: string) => `${bucket}${TO_SUFFIX}`;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Coerce a raw extra/param value to a finite number. URL state arrives as
 * strings (e.g. `"5"`), so a bare `as number` cast would leave numeric
 * filters looking incomplete and silently drop them. Returns undefined for
 * anything that is not a finite number or numeric string.
 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Coerce a raw value to a known {@link CountOperator}, else undefined. */
function toOperator(value: unknown): CountOperator | undefined {
  return COUNT_OPERATORS.includes(value as CountOperator)
    ? (value as CountOperator)
    : undefined;
}

/**
 * Whether a count-filter state is complete enough to affect a query.
 *
 * @public
 */
export function isCountFilterComplete(state: CountFilterState): boolean {
  if (!state.op) return false;
  if (state.op === "between") {
    return isNumber(state.from) && isNumber(state.to);
  }
  return isNumber(state.value);
}

/**
 * Convert a state update to URL-extra values for one bucket.
 *
 * @public
 */
export function countFilterExtra(
  bucket: string,
  state: CountFilterState
): ExtraFilters {
  return {
    [opKey(bucket)]: state.op,
    [valueKey(bucket)]: state.op === "between" ? undefined : state.value,
    [fromKey(bucket)]: state.op === "between" ? state.from : undefined,
    [toKey(bucket)]: state.op === "between" ? state.to : undefined,
  };
}

/**
 * URL-extra update that clears every value for one bucket.
 *
 * @public
 */
export function clearCountFilterExtra(bucket: string): ExtraFilters {
  return {
    [opKey(bucket)]: undefined,
    [valueKey(bucket)]: undefined,
    [fromKey(bucket)]: undefined,
    [toKey(bucket)]: undefined,
  };
}

/**
 * Rehydrate one bucket's count-filter state from an extra-filter bag.
 *
 * @public
 */
export function countFilterStateFromExtra(
  bucket: string,
  extra: Readonly<Record<string, FilterValue>>
): CountFilterState {
  return {
    op: toOperator(extra[opKey(bucket)]),
    value: toNumber(extra[valueKey(bucket)]),
    from: toNumber(extra[fromKey(bucket)]),
    to: toNumber(extra[toKey(bucket)]),
  };
}

/**
 * Remove incomplete count filters from backend params while preserving any
 * unrelated params. This lets a UI keep partial state in the URL without
 * sending invalid operator/value pairs to an API.
 *
 * @public
 */
export function sanitizeCountFilterParams<P extends Record<string, unknown>>(
  params: P,
  buckets: readonly string[]
): P {
  const out: Record<string, unknown> = { ...params };
  for (const bucket of buckets) {
    const state: CountFilterState = {
      op: toOperator(out[opKey(bucket)]),
      value: toNumber(out[valueKey(bucket)]),
      from: toNumber(out[fromKey(bucket)]),
      to: toNumber(out[toKey(bucket)]),
    };
    if (isCountFilterComplete(state)) continue;
    delete out[opKey(bucket)];
    delete out[valueKey(bucket)];
    delete out[fromKey(bucket)];
    delete out[toKey(bucket)];
  }
  return out as P;
}

/**
 * Build a compact chip label for a complete count filter.
 *
 * @public
 */
export function countFilterChipLabel(
  label: string,
  state: CountFilterState
): string | undefined {
  if (!isCountFilterComplete(state) || !state.op) return undefined;
  if (state.op === "between") {
    return `${label}: ${state.from}-${state.to}`;
  }
  return `${label} ${COUNT_OPERATOR_SYMBOL[state.op]} ${state.value}`;
}
