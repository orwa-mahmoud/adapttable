/**
 * Column filters, read the way the table wrote them.
 *
 * The table writes one `f_<key>` parameter per filter value, an `f_<key>Op`
 * beside it when the reader picked an operator, and a pair of suffixed
 * parameters for a range — `Min`/`Max` for numbers, `From`/`To` for dates.
 * A multi-value filter is one parameter whose entries are each
 * percent-encoded and joined with commas, so a value may itself contain a
 * comma. This module turns those parameters back into one entry per filter:
 * shaped when the schema declares nothing ({@link shapeFilters}), typed and
 * checked when it declares the filters ({@link typeFilters}).
 */
import {
  DATE_OPS,
  FILTER_OP_SUFFIX,
  isFilterGroup,
  NUMBER_OPS,
  parseRelativeToken,
  type QueryCondition,
  type QueryFilterGroup,
  RANGE_SUFFIXES,
  TEXT_OPS,
} from "@adapttable/core/query";

/** Prefix for a column filter, as the table writes it. */
export const FILTER_PREFIX = "f_";

/**
 * Split a multi-value filter parameter into its values — the exact inverse of
 * how the table writes a checklist or multi-select: entries joined with
 * commas, each one percent-encoded, so a value holding a comma or an `&`
 * survives.
 *
 * @param raw - The parameter's value, as `URLSearchParams.get` returns it.
 * @returns The values, trimmed, empty entries dropped.
 *
 * @public
 */
export function splitFilterValues(raw: string | null | undefined): string[] {
  if (raw == null || raw === "") return [];
  return raw
    .split(",")
    .map((part) => {
      try {
        return decodeURIComponent(part).trim();
      } catch {
        // A hand-edited link with a stray `%` keeps the entry as it arrived
        // rather than losing it.
        return part.trim();
      }
    })
    .filter((part) => part.length > 0);
}

/**
 * One filter as the URL carried it, with no type to check it against: its
 * operator beside it and a range's bounds joined, every value a string.
 *
 * @public
 */
export interface ShapedFilter {
  /** The operator the reader picked, when the link names one. */
  readonly op?: string;
  /** The value, when the filter has a single one. */
  readonly value?: string;
  /** A number range's lower bound (`f_<key>Min`). */
  readonly min?: string;
  /** A number range's upper bound (`f_<key>Max`). */
  readonly max?: string;
  /** A date range's start (`f_<key>From`). */
  readonly from?: string;
  /** A date range's end (`f_<key>To`). */
  readonly to?: string;
}

/** A text filter, typed. @public */
export interface TextFilter {
  readonly type: "text";
  /** One of the text operators. */
  readonly op: string;
  /** Absent for `empty` / `notEmpty`. */
  readonly value?: string;
}

/** A single-choice filter, typed. @public */
export interface SelectFilter {
  readonly type: "select";
  readonly op: "eq";
  readonly value: string;
}

/** A multi-value filter, typed. @public */
export interface ListFilter {
  readonly type: "multiSelect" | "checklist";
  readonly op: "in";
  readonly values: readonly string[];
}

/** A yes/no filter, typed. @public */
export interface BooleanFilter {
  readonly type: "boolean";
  readonly op: "eq";
  readonly value: boolean;
}

/** A number range filter, typed. @public */
export interface NumberRangeFilter {
  readonly type: "numberRange";
  /** One of the number operators. */
  readonly op: string;
  readonly min?: number;
  readonly max?: number;
  /** The listed numbers, for `in` / `notIn`. */
  readonly values?: readonly number[];
}

/** A date range filter, typed. @public */
export interface DateRangeFilter {
  readonly type: "dateRange";
  /** One of the date operators. */
  readonly op: string;
  /** ISO date or date-time. */
  readonly from?: string;
  /** ISO date or date-time. */
  readonly to?: string;
  /** The relative window (`today`, `last:7`), for `relative`. */
  readonly relative?: string;
}

/** A filter of a host-registered type, typed by its declared operators. @public */
export interface CustomTypedFilter {
  readonly type: "custom";
  /** The registered type name. */
  readonly filterType: string;
  readonly op: string;
  readonly value?: string;
}

/**
 * One filter, typed by its declaration and checked against it.
 *
 * @public
 */
export type TypedFilter =
  | TextFilter
  | SelectFilter
  | ListFilter
  | BooleanFilter
  | NumberRangeFilter
  | DateRangeFilter
  | CustomTypedFilter;

/**
 * A filter declaration the server checks a request against — the same
 * definition object the browser passes to `filters(…)`, or the parts of it a
 * server needs.
 *
 * @public
 */
export interface ServerFilterDef {
  /** State key: the `f_<key>` parameter. */
  readonly key: string;
  /** A built-in filter type, or one listed in `filterTypes`. */
  readonly type: string;
  /**
   * Choices for `select` / `multiSelect`. A static list is enforced; `"auto"`
   * and a loader are accepted as they are, since the server cannot know them.
   */
  readonly options?: unknown;
}

/**
 * A host-registered filter type, as far as a server checks it: its name and
 * operators. A `FilterTypeSpec` from `@adapttable/core` fits as it is.
 *
 * @public
 */
export interface ServerFilterType {
  readonly type: string;
  readonly ops: readonly string[];
  readonly defaultOp: string;
}

/** What `refuse` looks like to the readers below. */
export type Refuse = (param: string, value: string, reason: string) => void;

/**
 * Keep only the filters a user or role may use.
 *
 * The schema is built per request, so permission is this: pass the subset.
 *
 * @param defs - Every filter the table declares.
 * @param keys - The keys this caller may filter on.
 * @returns The permitted definitions, in their original order.
 *
 * @public
 */
export function pickFilters<TDef extends { readonly key: string }>(
  defs: readonly TDef[],
  keys: readonly string[]
): TDef[];
/**
 * Keep only the shorthand filters a user or role may use.
 *
 * @public
 */
export function pickFilters(
  defs: Readonly<Record<string, string>>,
  keys: readonly string[]
): Record<string, string>;
/**
 * Keep only the filters a user or role may use.
 *
 * @public
 */
export function pickFilters(
  defs: readonly { readonly key: string }[] | Readonly<Record<string, string>>,
  keys: readonly string[]
): { readonly key: string }[] | Record<string, string> {
  const allowed = new Set(keys);
  if (Array.isArray(defs)) {
    return (defs as readonly { readonly key: string }[]).filter((def) =>
      allowed.has(def.key)
    );
  }
  const out: Record<string, string> = {};
  for (const [key, type] of Object.entries(
    defs as Readonly<Record<string, string>>
  )) {
    if (allowed.has(key)) out[key] = type;
  }
  return out;
}

/** The declared filters, one list whichever form the schema used. */
export function declaredFilters(
  filters: Readonly<Record<string, string>> | readonly ServerFilterDef[]
): ServerFilterDef[] {
  if (Array.isArray(filters))
    return [...(filters as readonly ServerFilterDef[])];
  return Object.entries(filters as Readonly<Record<string, string>>).map(
    ([key, type]) => ({ key, type })
  );
}

/** The filter parameters in the namespace, by bare key (`team`, `teamOp`). */
function filterParams(
  params: URLSearchParams,
  ns: string
): Map<string, string> {
  const prefix = `${ns}${FILTER_PREFIX}`;
  const out = new Map<string, string>();
  params.forEach((value, key) => {
    if (key.startsWith(prefix) && !out.has(key.slice(prefix.length))) {
      out.set(key.slice(prefix.length), value);
    }
  });
  return out;
}

const SUFFIXES = [
  ["min", RANGE_SUFFIXES.numberRange.start],
  ["max", RANGE_SUFFIXES.numberRange.end],
  ["from", RANGE_SUFFIXES.dateRange.start],
  ["to", RANGE_SUFFIXES.dateRange.end],
  ["op", FILTER_OP_SUFFIX],
] as const;

/**
 * Every filter parameter, shaped, with nothing checked.
 *
 * A parameter ending in `Op`, `Min`, `Max`, `From` or `To` is read as that
 * part of the filter named by the rest of it. The names are the client's own:
 * never interpolate them into a query.
 */
export function shapeFilters(
  params: URLSearchParams,
  ns: string
): Record<string, ShapedFilter> {
  const out: Record<string, Record<string, string>> = {};
  for (const [bare, value] of filterParams(params, ns)) {
    if (value === "") continue;
    const suffix = SUFFIXES.find(
      ([, text]) => bare.endsWith(text) && bare.length > text.length
    );
    const key = suffix ? bare.slice(0, -suffix[1].length) : bare;
    const part = suffix ? suffix[0] : "value";
    out[key] = { ...out[key], [part]: value };
  }
  return out;
}

/** The operators a type allows, and the one it uses when none is named. */
function operatorsOf(
  type: string,
  custom: readonly ServerFilterType[]
): { ops: readonly string[]; defaultOp: string } | undefined {
  const registered = custom.find((spec) => spec.type === type);
  if (registered) return registered;
  switch (type) {
    case "text":
      return { ops: TEXT_OPS, defaultOp: "contains" };
    case "select":
    case "boolean":
      return { ops: ["eq"], defaultOp: "eq" };
    case "multiSelect":
    case "checklist":
      return { ops: ["in"], defaultOp: "in" };
    case "numberRange":
      return { ops: NUMBER_OPS, defaultOp: "gte" };
    case "dateRange":
      return { ops: DATE_OPS, defaultOp: "on" };
    default:
      return undefined;
  }
}

/** The static choices a definition allows, or `undefined` when any may come. */
function staticChoices(def: ServerFilterDef): Set<string> | undefined {
  if (!Array.isArray(def.options)) return undefined;
  const values = (def.options as readonly unknown[]).flatMap((option) =>
    option !== null &&
    typeof option === "object" &&
    typeof (option as { value?: unknown }).value === "string"
      ? [(option as { value: string }).value]
      : []
  );
  return new Set(values);
}

/** A finite number, or `undefined`. */
function numberOf(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/** An ISO date or date-time that names a real instant. */
function isIsoDate(raw: string): boolean {
  return ISO_DATE.test(raw) && !Number.isNaN(Date.parse(raw));
}

/** What a check needs to report a refusal by its own parameter. */
interface Reader {
  readonly def: ServerFilterDef;
  readonly param: (suffix?: string) => string;
  readonly refuse: Refuse;
  readonly choices: Set<string> | undefined;
}

/** Values outside a static list, refused by name. */
function outsideChoices(
  values: readonly string[],
  reader: Reader
): readonly string[] {
  const { choices } = reader;
  if (!choices) return [];
  return values.filter((value) => !choices.has(value));
}

function typedText(
  op: string,
  value: string | undefined
): TextFilter | undefined {
  if (op === "empty" || op === "notEmpty") return { type: "text", op };
  if (value === undefined || value === "") return undefined;
  return { type: "text", op, value };
}

function typedSelect(
  value: string | undefined,
  reader: Reader
): SelectFilter | undefined {
  if (value === undefined || value === "") return undefined;
  if (outsideChoices([value], reader).length > 0) {
    reader.refuse(reader.param(), value, "not one of the filter's options");
    return undefined;
  }
  return { type: "select", op: "eq", value };
}

function typedList(
  type: "multiSelect" | "checklist",
  raw: string | undefined,
  reader: Reader
): ListFilter | undefined {
  const values = splitFilterValues(raw);
  if (values.length === 0) return undefined;
  const outside = outsideChoices(values, reader);
  if (outside.length > 0) {
    reader.refuse(
      reader.param(),
      outside.join(", "),
      "not one of the filter's options"
    );
    return undefined;
  }
  return { type, op: "in", values };
}

function typedBoolean(
  value: string | undefined,
  reader: Reader
): BooleanFilter | undefined {
  if (value === undefined || value === "") return undefined;
  if (value !== "true" && value !== "false") {
    reader.refuse(reader.param(), value, "not true or false");
    return undefined;
  }
  return { type: "boolean", op: "eq", value: value === "true" };
}

function typedNumberRange(
  op: string,
  raw: ShapedFilter,
  reader: Reader
): NumberRangeFilter | undefined {
  const { start, end } = RANGE_SUFFIXES.numberRange;
  if (op === "in" || op === "notIn") {
    const listed = splitFilterValues(raw.value);
    const values = listed.map(Number);
    if (values.some((n) => !Number.isFinite(n))) {
      reader.refuse(reader.param(), raw.value ?? "", "not a list of numbers");
      return undefined;
    }
    return values.length === 0
      ? undefined
      : { type: "numberRange", op, values };
  }
  const min = numberOf(raw.min);
  const max = numberOf(raw.max);
  if (raw.min !== undefined && min === undefined) {
    reader.refuse(reader.param(start), raw.min, "not a number");
    return undefined;
  }
  if (raw.max !== undefined && max === undefined) {
    reader.refuse(reader.param(end), raw.max, "not a number");
    return undefined;
  }
  if (min === undefined && max === undefined) return undefined;
  return {
    type: "numberRange",
    op,
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

function typedDateRange(
  op: string,
  raw: ShapedFilter,
  reader: Reader
): DateRangeFilter | undefined {
  const { start, end } = RANGE_SUFFIXES.dateRange;
  if (op === "empty") return { type: "dateRange", op };
  if (op === "relative") {
    const token = parseRelativeToken(raw.from);
    if (!token) {
      reader.refuse(reader.param(start), raw.from ?? "", "not a relative date");
      return undefined;
    }
    return { type: "dateRange", op, relative: token };
  }
  for (const [value, suffix] of [
    [raw.from, start],
    [raw.to, end],
  ] as const) {
    if (value !== undefined && !isIsoDate(value)) {
      reader.refuse(reader.param(suffix), value, "not an ISO date");
      return undefined;
    }
  }
  if (raw.from === undefined && raw.to === undefined) return undefined;
  return {
    type: "dateRange",
    op,
    ...(raw.from === undefined ? {} : { from: raw.from }),
    ...(raw.to === undefined ? {} : { to: raw.to }),
  };
}

/** One declared filter, typed from its shaped parameters. */
function typeOne(
  def: ServerFilterDef,
  raw: ShapedFilter,
  custom: readonly ServerFilterType[],
  reader: Reader
): TypedFilter | undefined {
  const operators = operatorsOf(def.type, custom);
  if (!operators) {
    reader.refuse(reader.param(), def.type, "not a known filter type");
    return undefined;
  }
  const op = raw.op ?? operators.defaultOp;
  if (!operators.ops.includes(op)) {
    reader.refuse(
      reader.param(FILTER_OP_SUFFIX),
      op,
      `not an operator a ${def.type} filter allows`
    );
    return undefined;
  }
  const registered = custom.some((spec) => spec.type === def.type);
  if (registered) {
    return {
      type: "custom",
      filterType: def.type,
      op,
      ...(raw.value === undefined ? {} : { value: raw.value }),
    };
  }
  switch (def.type) {
    case "text":
      return typedText(op, raw.value);
    case "select":
      return typedSelect(raw.value, reader);
    case "multiSelect":
    case "checklist":
      return typedList(def.type, raw.value, reader);
    case "boolean":
      return typedBoolean(raw.value, reader);
    case "numberRange":
      return typedNumberRange(op, raw, reader);
    default:
      return typedDateRange(op, raw, reader);
  }
}

/** The parameters a declaration owns, by bare key. */
function ownedKeys(def: ServerFilterDef): string[] {
  const own = [def.key, def.key + FILTER_OP_SUFFIX];
  if (def.type === "numberRange") {
    const { start, end } = RANGE_SUFFIXES.numberRange;
    own.push(def.key + start, def.key + end);
  }
  if (def.type === "dateRange") {
    const { start, end } = RANGE_SUFFIXES.dateRange;
    own.push(def.key + start, def.key + end);
  }
  return own;
}

/** Split an owned parameter back into its filter's part. */
function partOf(def: ServerFilterDef, bare: string): keyof ShapedFilter {
  if (bare === def.key) return "value";
  const rest = bare.slice(def.key.length);
  const found = SUFFIXES.find(([, text]) => text === rest);
  return found ? found[0] : "value";
}

/**
 * Every declared filter, typed and checked; everything else refused.
 *
 * A parameter that belongs to no declared filter is refused, as is an
 * operator the type does not allow, a malformed number or date, or a value
 * outside a static option list.
 */
export function typeFilters(
  params: URLSearchParams,
  ns: string,
  defs: readonly ServerFilterDef[],
  custom: readonly ServerFilterType[],
  refuse: Refuse
): {
  readonly typed: Record<string, TypedFilter>;
  readonly raw: Record<string, string>;
} {
  const owner = new Map<string, ServerFilterDef>();
  for (const def of defs) {
    for (const key of ownedKeys(def)) owner.set(key, def);
  }
  const shaped = new Map<string, Record<string, string>>();
  const raw: Record<string, string> = {};
  for (const [bare, value] of filterParams(params, ns)) {
    const def = owner.get(bare);
    if (!def) {
      refuse(`${FILTER_PREFIX}${bare}`, value, "not a declared filter");
      continue;
    }
    if (value === "") continue;
    raw[bare] = value;
    shaped.set(def.key, { ...shaped.get(def.key), [partOf(def, bare)]: value });
  }
  const typed: Record<string, TypedFilter> = {};
  for (const def of defs) {
    const parts = shaped.get(def.key);
    if (!parts) continue;
    const reader: Reader = {
      def,
      param: (suffix = "") => `${FILTER_PREFIX}${def.key}${suffix}`,
      refuse,
      choices: staticChoices(def),
    };
    const one = typeOne(def, parts, custom, reader);
    if (one) typed[def.key] = one;
  }
  return { typed, raw };
}

/** Every condition in a filter tree, however deeply nested. */
function conditionsOf(group: QueryFilterGroup): QueryCondition[] {
  const found: QueryCondition[] = [];
  const walk = (node: QueryFilterGroup) => {
    for (const child of node.conditions) {
      if (isFilterGroup(child)) walk(child);
      else found.push(child);
    }
  };
  walk(group);
  return found;
}

/**
 * Why a filter tree cannot be used against the declared filters, or
 * `undefined` when every condition checks out: a declared key, an operator
 * its type allows, and a value of the type's shape.
 */
export function treeProblem(
  tree: QueryFilterGroup,
  defs: readonly ServerFilterDef[],
  custom: readonly ServerFilterType[]
): string | undefined {
  const byKey = new Map(defs.map((def) => [def.key, def]));
  for (const condition of conditionsOf(tree)) {
    const def = byKey.get(condition.key);
    if (!def) return `"${condition.key}" is not a declared filter`;
    const operators = operatorsOf(def.type, custom);
    if (!operators?.ops.includes(condition.op)) {
      return `"${condition.op}" is not an operator a ${def.type} filter allows`;
    }
    const problem = valueProblem(def, condition);
    if (problem) return problem;
  }
  return undefined;
}

/** Why one tree condition's value does not fit its filter's type. */
function valueProblem(
  def: ServerFilterDef,
  condition: QueryCondition
): string | undefined {
  const { value, op } = condition;
  const noOperand = op === "empty" || op === "notEmpty";
  if (noOperand) return undefined;
  const choices = staticChoices(def);
  const list = Array.isArray(value) ? value : [value];
  switch (def.type) {
    case "numberRange":
      return list.every(
        (entry) => typeof entry === "number" && Number.isFinite(entry)
      )
        ? undefined
        : `"${condition.key}" needs a number`;
    case "dateRange":
      if (op === "relative") {
        return typeof value === "string" && parseRelativeToken(value)
          ? undefined
          : `"${condition.key}" needs a relative date`;
      }
      return list.every(
        (entry) => typeof entry === "string" && isIsoDate(entry)
      )
        ? undefined
        : `"${condition.key}" needs an ISO date`;
    case "boolean":
      return typeof value === "boolean"
        ? undefined
        : `"${condition.key}" needs true or false`;
    case "select":
    case "multiSelect":
    case "checklist":
      if (!list.every((entry) => typeof entry === "string")) {
        return `"${condition.key}" needs text values`;
      }
      return choices && !list.every((entry) => choices.has(entry as string))
        ? `"${condition.key}" names a value outside its options`
        : undefined;
    default:
      return undefined;
  }
}
