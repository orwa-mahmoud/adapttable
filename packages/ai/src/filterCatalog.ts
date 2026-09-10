/**
 * Live filter catalog for the assistant — the same defs the table draws,
 * minus anything the developer hid or any option list too large to send.
 */
import {
  conditionToExtra,
  defaultFilterRegistry,
  FILTER_AI_OPTIONS_LIMIT,
  type FilterAiOptions,
  type FilterDef,
  filterLabel,
  type FilterOption,
  filterStateKeys,
  filterTypeDefaultOp,
  filterTypeOps,
  type FilterTypeRegistry,
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
          `ops: ${filter.operators.join(", ")}`,
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

function optionValues(filter: AgentFilter): ReadonlySet<string> | undefined {
  if (!filter.options) return undefined;
  return new Set(filter.options.map((option) => option.value));
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

function asValueList(raw: unknown): readonly unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw == null) return [];
  return [raw];
}

function assertOptionValue(filter: AgentFilter, raw: unknown): void {
  const allowed = optionValues(filter);
  if (!allowed) return;
  const values = asValueList(raw);
  for (const value of values) {
    if (typeof value !== "string" || allowed.has(value)) continue;
    throw new Error(
      `"${filter.key}" does not accept option "${String(value)}"`
    );
  }
}

function extrasFromCondition(
  filter: AgentFilter,
  condition: { key: string; op: string; value?: unknown },
  registry: FilterTypeRegistry
): Record<string, unknown> {
  if (!filter.operators.includes(condition.op)) {
    throw new Error(`"${filter.key}" cannot use operator "${condition.op}"`);
  }
  assertOptionValue(filter, condition.value);
  return conditionToExtra(
    { key: filter.key, type: filter.type },
    condition,
    registry
  );
}

function validateExtras(
  extras: Record<string, unknown>,
  catalog: readonly AgentFilter[]
): void {
  const owner = new Map<string, AgentFilter>();
  for (const filter of catalog) {
    for (const key of filter.valueKeys) owner.set(key, filter);
  }
  for (const key of Object.keys(extras)) {
    const filter = owner.get(key);
    if (!filter) {
      throw new Error(`"${key}" is not a visible filter key`);
    }
    assertPlainExtraValue(key, extras[key]);
    if (key === filter.key) assertOptionValue(filter, extras[key]);
    if (key === `${filter.key}Op`) {
      const op = extras[key];
      if (typeof op === "string" && !filter.operators.includes(op)) {
        throw new Error(`"${filter.key}" cannot use operator "${op}"`);
      }
    }
  }
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
    const extras: Record<string, unknown> = {};
    for (const entry of filters) {
      if (!isCondition(entry)) {
        throw new Error("each filter condition needs key and op");
      }
      const filter = catalog.find((item) => item.key === entry.key);
      if (!filter) {
        throw new Error(`"${entry.key}" is not a visible filter`);
      }
      Object.assign(extras, extrasFromCondition(filter, entry, registry));
    }
    return extras;
  }
  if (typeof filters !== "object") {
    throw new TypeError("setFilters requires a filter object");
  }
  const extras = filters as Record<string, unknown>;
  validateExtras(extras, catalog);
  return extras;
}
