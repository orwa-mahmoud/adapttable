/**
 * Live filter catalog for the assistant — the same defs the table draws,
 * minus anything the developer hid or any option list too large to send.
 */
import {
  conditionToExtra,
  DATE_OP_LABEL_KEYS,
  defaultFilterRegistry,
  defaultLabels,
  FILTER_AI_OPTIONS_LIMIT,
  type FilterAiOptions,
  type FilterDef,
  filterLabel,
  type FilterOption,
  filterStateKeys,
  filterTypeDefaultOp,
  filterTypeOps,
  type FilterTypeRegistry,
  NUMBER_OP_LABEL_KEYS,
  type TableLabels,
  TEXT_OP_LABEL_KEYS,
} from "@adapttable/core";

import type { AgentFilter, AgentFilterOption } from "./types";

/** Per-column readability the filter catalog consults. @public */
export interface FilterCatalogColumnPatch {
  readonly readable?: boolean;
}

function optionsCap(ai: FilterAiOptions | undefined): number {
  if (ai?.options === false) return -1;
  if (typeof ai?.options === "number" && Number.isFinite(ai.options)) {
    return Math.max(0, Math.floor(ai.options));
  }
  return FILTER_AI_OPTIONS_LIMIT;
}

function asOptions(
  options: FilterDef["options"]
): readonly FilterOption[] | undefined {
  return Array.isArray(options) ? options : undefined;
}

function publishedOptions(
  def: FilterDef,
  cap: number
): Pick<AgentFilter, "options" | "optionsOmitted"> {
  const listed = asOptions(def.options);
  const hasUnresolved =
    def.options === "auto" || typeof def.options === "function";
  if (cap < 0) {
    return listed !== undefined || hasUnresolved
      ? { optionsOmitted: true }
      : {};
  }
  if (hasUnresolved) return { optionsOmitted: true };
  if (listed === undefined || listed.length === 0) return {};
  if (listed.length > cap) return { optionsOmitted: true };
  const options: AgentFilterOption[] = listed.map((option) => ({
    value: option.value,
    label: option.label,
  }));
  return { options };
}

function columnId(def: FilterDef): string {
  return def.column ?? def.key;
}

function agentAllowsFilter(
  def: FilterDef,
  patches: Readonly<Record<string, FilterCatalogColumnPatch>> | undefined
): boolean {
  return patches?.[columnId(def)]?.readable !== false;
}

/**
 * Publish the defs the table will honour. `undefined` when there is no
 * catalog (custom form, no defs). An empty array means every def was hidden.
 */
export function agentFiltersFromDefs(
  defs: readonly FilterDef[] | undefined,
  registry: FilterTypeRegistry | undefined,
  patches?: Readonly<Record<string, FilterCatalogColumnPatch>>
): readonly AgentFilter[] | undefined {
  if (defs === undefined || defs.length === 0) return undefined;
  const types = registry ?? defaultFilterRegistry;
  const next: AgentFilter[] = [];
  for (const def of defs) {
    if (def.ai === false || !agentAllowsFilter(def, patches)) continue;
    next.push({
      key: def.key,
      label: filterLabel(def),
      type: def.type,
      operators: filterTypeOps(def, types),
      defaultOperator: filterTypeDefaultOp(def, types),
      valueKeys: filterStateKeys(def, types),
      ...publishedOptions(def, optionsCap(def.ai)),
    });
  }
  return next;
}

export function formatFilterCatalog(
  catalog: readonly AgentFilter[] | undefined
): string {
  if (catalog === undefined) {
    return (
      " The live table has not published a filter catalog — send the extra " +
      "bag the application documented, or `{}` to clear."
    );
  }
  if (catalog.length === 0) {
    return " No filters are visible to the assistant. Send `{}` to clear.";
  }
  return (
    " Eligible now: " +
    catalog
      .map((filter) => {
        const parts = [
          filter.type,
          `ops: ${formatFilterOperators(filter.operators)}`,
          `keys: ${filter.valueKeys.join(", ")}`,
        ];
        if (filter.options) {
          parts.push(
            `options: ${filter.options
              .map((option) => option.value)
              .join(", ")}`
          );
        } else if (filter.optionsOmitted) {
          parts.push("options omitted");
        }
        return `${filter.key} [${parts.join("; ")}]`;
      })
      .join("; ") +
    "."
  );
}

function isCondition(value: unknown): value is {
  key: string;
  op: string;
  value?: unknown;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.key === "string" && typeof record.op === "string";
}

function conditionKey(record: Record<string, unknown>): string | undefined {
  if (typeof record.key === "string") return record.key;
  if (typeof record.column === "string") return record.column;
  return undefined;
}

function conditionValue(record: Record<string, unknown>): unknown {
  if ("value" in record) return record.value;
  if ("values" in record) return record.values;
  return undefined;
}

/**
 * A condition the model almost named: `key` or `column`, optional `op`.
 * A bag like `{ team: ["Core"] }` is not this — that is extras.
 */
function namedCondition(
  value: unknown,
  catalog: readonly AgentFilter[]
): { key: string; op: string; value?: unknown } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const key = conditionKey(record);
  if (!key) return undefined;
  const filter = findFilter(catalog, key);
  if (!filter) return undefined;
  const op = typeof record.op === "string" ? record.op : filter.defaultOperator;
  // The catalog's own key, so everything downstream addresses one spelling.
  return { key: filter.key, op, value: conditionValue(record) };
}

/** A value stripped of what never distinguishes two choices. */
function fold(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** What a filter will take, named in the spellings it published. */
function optionNames(filter: AgentFilter): string {
  return (filter.options ?? []).map((option) => option.value).join(", ");
}

/**
 * The option a value names, in the catalog's own spelling.
 *
 * A caller picks from a list this table published, so a value that differs
 * only in case or in surrounding space has named exactly one option, and
 * naming it is not the same as guessing at it. What gets applied is the
 * published spelling, because that is what the rows hold — resolving
 * `platform` and then filtering on it would match nothing.
 *
 * Labels count as names too: both sides travel in the contract, so a caller
 * that answered with the one it was shown is answering correctly. An exact
 * value wins over any near match, and two options that differ only in case
 * are a real ambiguity — refused like any other unknown value.
 */
function resolveOption(filter: AgentFilter, value: string): string | undefined {
  const options = filter.options;
  if (!options) return value;
  const exact = options.find((option) => option.value === value);
  if (exact) return exact.value;
  const wanted = fold(value);
  const [only, ...rest] = options.filter(
    (option) => fold(option.value) === wanted || fold(option.label) === wanted
  );
  return only && rest.length === 0 ? only.value : undefined;
}

/**
 * Every value in a filter argument, in the catalog's spellings.
 *
 * @throws when a value names no option, naming what the filter does take —
 * a refusal that withholds the list leaves a caller guessing at a set the
 * table could simply have shown it.
 */
function resolveOptionValue(filter: AgentFilter, raw: unknown): unknown {
  if (!filter.options) return raw;
  const one = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const resolved = resolveOption(filter, value);
    if (resolved !== undefined) return resolved;
    throw new Error(
      `"${filter.key}" takes one of: ${optionNames(filter)} — not "${value}"`
    );
  };
  return Array.isArray(raw) ? raw.map(one) : one(raw);
}

function assertPlainExtraValue(key: string, raw: unknown): void {
  if (raw == null) return;
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) assertPlainExtraValue(key, item);
    return;
  }
  const kind = typeof raw === "object" ? "an object" : typeof raw;
  throw new Error(`"${key}" must be a value or list, not ${kind}`);
}

/** The filter a key names, by its own key or its label, case aside. */
function findFilter(
  catalog: readonly AgentFilter[],
  key: string
): AgentFilter | undefined {
  const exact = catalog.find((item) => item.key === key);
  if (exact) return exact;
  const wanted = fold(key);
  const near = catalog.filter(
    (item) => fold(item.key) === wanted || fold(item.label) === wanted
  );
  return near.length === 1 ? near[0] : undefined;
}

/**
 * The same, required.
 *
 * @throws naming the filters this table has, for the same reason an unknown
 * option does.
 */
function requireFilter(
  catalog: readonly AgentFilter[],
  key: string
): AgentFilter {
  const filter = findFilter(catalog, key);
  if (filter) return filter;
  const names = catalog.map((item) => item.key).join(", ");
  throw new Error(`"${key}" is not a filter on this table — it has: ${names}`);
}

function asNamedCondition(
  entry: unknown,
  catalog: readonly AgentFilter[]
): { key: string; op: string; value?: unknown } {
  const condition = isCondition(entry) ? entry : namedCondition(entry, catalog);
  if (!condition) {
    throw new Error("each filter condition needs key and op");
  }
  return condition;
}

function extrasFromConditionList(
  filters: readonly unknown[],
  catalog: readonly AgentFilter[],
  registry: FilterTypeRegistry
): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  for (const entry of filters) {
    const condition = asNamedCondition(entry, catalog);
    Object.assign(
      extras,
      extrasFromCondition(
        requireFilter(catalog, condition.key),
        condition,
        registry
      )
    );
  }
  return extras;
}

const CONDITION_FIELDS = new Set(["key", "column", "op", "value", "values"]);

function extrasFromConditionObject(
  filters: Record<string, unknown>,
  catalog: readonly AgentFilter[],
  registry: FilterTypeRegistry
): Record<string, unknown> | undefined {
  const keys = Object.keys(filters);
  if (keys.length === 0 || keys.some((key) => !CONDITION_FIELDS.has(key))) {
    return undefined;
  }
  const single = isCondition(filters)
    ? filters
    : namedCondition(filters, catalog);
  if (!single) return undefined;
  return extrasFromCondition(
    requireFilter(catalog, single.key),
    single,
    registry
  );
}

const OP_LABEL_KEYS: Readonly<Record<string, keyof TableLabels>> = {
  ...TEXT_OP_LABEL_KEYS,
  ...NUMBER_OP_LABEL_KEYS,
  ...DATE_OP_LABEL_KEYS,
};

/**
 * The built-in English caption for an operator id, when it is not the id
 * itself. `gte` is "On or after"; `between` is already the word.
 */
export function operatorCaption(op: string): string | undefined {
  const key = OP_LABEL_KEYS[op];
  if (!key) return undefined;
  const label = defaultLabels[key];
  return typeof label === "string" ? label : undefined;
}

/**
 * Operator ids as describe lists them: the token, plus the library caption
 * when the token would not be obvious on its own.
 */
export function formatFilterOperators(ops: readonly string[]): string {
  return ops
    .map((op) => {
      const caption = operatorCaption(op);
      if (!caption || fold(caption) === fold(op)) return op;
      return `${op} (${caption})`;
    })
    .join(", ");
}

const OPERATOR_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "=": ["eq", "in", "on"],
  "==": ["eq", "in", "on"],
  eq: ["in", "on"],
  equals: ["eq", "in", "on"],
  equal: ["eq", "in", "on"],
  "!=": ["neq", "notIn"],
  "<>": ["neq", "notIn"],
  neq: ["notIn"],
  greater: ["gte", "gt", "after"],
  "greater than": ["gt", "gte", "after"],
  more: ["gt", "gte", "after"],
  gt: ["gt", "after", "gte"],
  gte: ["gte", "after"],
  after: ["after", "gte", "gt"],
  since: ["gte", "after", "gt"],
  from: ["gte", "after", "gt"],
  less: ["lte", "lt", "before"],
  "less than": ["lt", "lte", "before"],
  lt: ["lt", "before", "lte"],
  lte: ["lte", "before"],
  before: ["before", "lte", "lt"],
  until: ["lte", "before", "lt"],
  till: ["lte", "before", "lt"],
  between: ["between"],
  range: ["between"],
  on: ["on", "eq"],
};

function resolveOperator(filter: AgentFilter, op: string): string {
  if (filter.operators.includes(op)) return op;
  const wanted = fold(op);
  for (const [alias, candidates] of Object.entries(OPERATOR_ALIASES)) {
    if (fold(alias) !== wanted) continue;
    for (const candidate of candidates) {
      if (filter.operators.includes(candidate)) return candidate;
    }
  }
  const [only, ...rest] = filter.operators.filter(
    (name) => fold(name) === wanted
  );
  // Unresolved on purpose: the caller reports it, and it names the whole set.
  return only && rest.length === 0 ? only : op;
}

function extrasFromCondition(
  filter: AgentFilter,
  condition: { key: string; op: string; value?: unknown },
  registry: FilterTypeRegistry
): Record<string, unknown> {
  const op = requireOperator(filter, condition.op);
  condition = {
    ...condition,
    op,
    value: resolveOptionValue(filter, condition.value),
  };
  return conditionToExtra(
    { key: filter.key, type: filter.type },
    condition,
    registry
  );
}

/** Which filter owns each extra-bag key, by its own spelling and folded. */
interface ExtraKeyIndex {
  readonly owner: ReadonlyMap<string, AgentFilter>;
  readonly folded: ReadonlyMap<string, { filter: AgentFilter; key: string }[]>;
}

function indexExtraKeys(catalog: readonly AgentFilter[]): ExtraKeyIndex {
  const owner = new Map<string, AgentFilter>();
  const folded = new Map<string, { filter: AgentFilter; key: string }[]>();
  for (const filter of catalog) {
    for (const key of filter.valueKeys) {
      owner.set(key, filter);
      const bucket = folded.get(fold(key)) ?? [];
      bucket.push({ filter, key });
      folded.set(fold(key), bucket);
    }
  }
  return { owner, folded };
}

/**
 * The key a bag entry names, in the catalog's own spelling.
 *
 * @throws naming the keys this table has.
 */
function requireExtraKey(
  index: ExtraKeyIndex,
  given: string
): { filter: AgentFilter; key: string } {
  const exact = index.owner.get(given);
  if (exact) return { filter: exact, key: given };
  const [only, ...rest] = index.folded.get(fold(given)) ?? [];
  if (only && rest.length === 0) return only;
  const names = [...index.owner.keys()].join(", ");
  throw new Error(
    `"${given}" is not a filter key on this table — it has: ${names}`
  );
}

/** One operator, resolved, or a refusal naming the ones on offer. */
function requireOperator(filter: AgentFilter, given: string): string {
  const op = resolveOperator(filter, given);
  if (filter.operators.includes(op)) return op;
  throw new Error(
    `"${filter.key}" takes one of: ${filter.operators.join(", ")} — not "${given}"`
  );
}

/**
 * One extra bag in the catalog's own spellings, or a refusal that says why.
 *
 * Resolution rather than validation: a key, an operator and a value that name
 * exactly one published choice are rewritten to the spelling the table uses,
 * so what reaches the host is what its own controls would have sent.
 */
function resolvedExtras(
  extras: Record<string, unknown>,
  catalog: readonly AgentFilter[]
): Record<string, unknown> {
  const index = indexExtraKeys(catalog);
  const resolved: Record<string, unknown> = {};
  for (const [given, value] of Object.entries(extras)) {
    const { filter, key } = requireExtraKey(index, given);
    assertPlainExtraValue(key, value);
    if (key === filter.key) {
      resolved[key] = resolveOptionValue(filter, value);
    } else if (key === `${filter.key}Op` && typeof value === "string") {
      resolved[key] = requireOperator(filter, value);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/**
 * Turn a `view.setFilters` argument into the extra bag the table applies.
 *
 * No catalog → the host's own object (arrays are refused).
 * A catalog → extras or `{ key, op, value }` conditions, validated.
 */
export function extrasFromAgentFilters(
  filters: unknown,
  catalog: readonly AgentFilter[] | undefined,
  registry: FilterTypeRegistry = defaultFilterRegistry
): Record<string, unknown> {
  if (filters == null) return {};
  if (catalog === undefined) {
    if (typeof filters !== "object" || Array.isArray(filters)) {
      throw new TypeError("setFilters requires a filter object");
    }
    return filters as Record<string, unknown>;
  }
  if (Array.isArray(filters)) {
    return extrasFromConditionList(filters, catalog, registry);
  }
  if (typeof filters !== "object") {
    throw new TypeError("setFilters requires a filter object");
  }
  const asCondition = extrasFromConditionObject(
    filters as Record<string, unknown>,
    catalog,
    registry
  );
  if (asCondition) return asCondition;
  return resolvedExtras(filters as Record<string, unknown>, catalog);
}
