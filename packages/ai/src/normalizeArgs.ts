/**
 * Accept the argument names models actually emit before schema validation.
 *
 * Guides already say `key` not `column` for sort, group and pin. Models
 * still send `column`. Rewriting here means the table changes instead of
 * every receipt failing with "$.column is not allowed".
 */
import type { JsonSchema } from "./types";

const KEY_FROM_COLUMN = new Set([
  "view.setSort",
  "view.setGroupBy",
  "view.pinColumn",
]);

/**
 * Capabilities that address a row, where `key` means `rowKey`.
 *
 * The mirror of the set above, and caused by it: sort, group and pin all take
 * a plain `key`, so a model that has learned this table's vocabulary reaches
 * for `key` when it wants to name a row too.
 */
const ROW_KEY_FROM_KEY = new Set(["rows.resolve", "view.pinRow"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function pickString(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * The direction a caller asked for, in the two words the schema takes.
 *
 * Case and surrounding space never distinguish one direction from the other,
 * and `DESC` is not a different sort from `desc` — so folding them here means
 * the reader sees their sort rather than "$.dir must be one of". A word that
 * is neither still travels on and is refused by the schema, which names both.
 */
function normalizeDir(value: string): string {
  const wanted = value.trim().toLocaleLowerCase();
  if (wanted === "descending" || wanted === "highest") return "desc";
  if (wanted === "ascending" || wanted === "lowest") return "asc";
  if (wanted === "desc" || wanted === "asc") return wanted;
  return value;
}

function hasKey(record: Record<string, unknown>): boolean {
  return "key" in record;
}

function normalizeSortArgs(
  record: Record<string, unknown>
): Record<string, unknown> {
  const nested = asRecord(record.sort);
  if (typeof record.sort === "string" && !hasKey(record)) {
    record.key = record.sort;
    delete record.sort;
  }
  if (nested) {
    if (!hasKey(record)) {
      record.key = pickString(nested, "key", "column", "id");
    }
    const nestedDir = pickString(nested, "dir", "direction", "order");
    if (record.dir == null && nestedDir) record.dir = normalizeDir(nestedDir);
    delete record.sort;
  }
  if (!hasKey(record)) {
    record.key = pickString(record, "sortBy", "field");
    delete record.sortBy;
    delete record.field;
  }
  if (record.dir == null) {
    const dir = pickString(record, "direction", "order", "sortDir");
    if (dir) {
      record.dir = normalizeDir(dir);
      delete record.direction;
      delete record.order;
      delete record.sortDir;
    }
  }
  // The field the guide asks for gets the same reading as its near-misses: a
  // direction spelled `DESC` was the only one it could have been.
  if (typeof record.dir === "string") record.dir = normalizeDir(record.dir);
  return record;
}

/**
 * The single batch property a capability takes, when it takes exactly one.
 *
 * `edit.cells` requires only `edits`, `rows.add` only `rows`. That shape is
 * what makes the repair below readable off the schema instead of off a list
 * of capability names — a host's own batch capability gets it too.
 */
function batchProperty(
  input: JsonSchema | undefined
): { readonly name: string; readonly items: JsonSchema } | undefined {
  const [name, ...rest] = input?.required ?? [];
  if (name === undefined || rest.length > 0) return undefined;
  const property = input?.properties?.[name];
  if (property?.type !== "array") return undefined;
  return { name, items: property.items ?? {} };
}

/**
 * Accept one item where a capability takes a batch of them.
 *
 * A reader asks for one cell to change, so the model sends one cell:
 * `{rowKey, column, value}` rather than `{edits: [{rowKey, column, value}]}`.
 * Both repairs here are the only reading that document has — a lone value
 * where an array is required is that array's one element, and a body built
 * entirely out of the item's own property names is one item. Anything else is
 * left for validation to name.
 */
function normalizeBatchArgs(
  record: Record<string, unknown>,
  input: JsonSchema | undefined
): Record<string, unknown> {
  const batch = batchProperty(input);
  if (!batch) return record;
  const present = record[batch.name];
  if (present !== undefined) {
    if (!Array.isArray(present)) record[batch.name] = [present];
    return record;
  }
  const itemProperties = Object.keys(batch.items.properties ?? {});
  const given = Object.keys(record);
  if (
    given.length > 0 &&
    itemProperties.length > 0 &&
    given.every((name) => itemProperties.includes(name))
  ) {
    return { [batch.name]: [record] };
  }
  return record;
}

/**
 * Rewrite a capability argument bag into the schema the table published.
 *
 * @param key - The capability being called.
 * @param args - What the backend sent as its arguments.
 * @param input - That capability's own input schema, when the caller has it.
 *
 * Unknown keys and non-objects are left alone so validation still names them.
 */
export function normalizeCapabilityArgs(
  key: string,
  args: unknown,
  input?: JsonSchema
): unknown {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return args ?? {};
  }
  const record = { ...(args as Record<string, unknown>) };
  if (
    KEY_FROM_COLUMN.has(key) &&
    !("key" in record) &&
    typeof record.column === "string"
  ) {
    record.key = record.column;
    delete record.column;
  }
  if (
    ROW_KEY_FROM_KEY.has(key) &&
    !("rowKey" in record) &&
    typeof record.key === "string"
  ) {
    record.rowKey = record.key;
    delete record.key;
  }
  if (key === "view.setSort") return normalizeSortArgs(record);
  // The guide says `query`; the capability is called `setSearch` and the table
  // calls the thing a search, so `search` is what a model reaches for. The
  // guide is still the authority — this only accepts the near-miss rather than
  // making a reader read "$.query is required" about a search that worked.
  if (
    key === "view.setSearch" &&
    !("query" in record) &&
    typeof record.search === "string"
  ) {
    record.query = record.search;
    delete record.search;
  }
  // Same near-miss, same reason: the capability is called `setGroupBy`, so
  // `groupBy` is the name a model reaches for — and the guide that says
  // otherwise is the first thing a compact context defers.
  if (
    key === "view.setGroupBy" &&
    !("key" in record) &&
    (typeof record.groupBy === "string" || record.groupBy === null)
  ) {
    record.key = record.groupBy;
    delete record.groupBy;
  }
  // `pinColumn` takes `side`, and both its summary and its guide describe
  // pinning "to an edge" — so `edge` is the word the capability hands the
  // model on its way to the wrong argument name.
  if (
    key === "view.pinColumn" &&
    !("side" in record) &&
    (typeof record.edge === "string" || record.edge === null)
  ) {
    record.side = record.edge;
    delete record.edge;
  }
  if (key === "view.setAggregations") normalizeAggregationArgs(record);
  return normalizeBatchArgs(record, input);
}

/**
 * `setAggregations` taking `set` reads as a detail of this API, while
 * `aggregations` is the word the capability itself uses. Spoken operation
 * names (`average`) become the ids the table takes (`avg`).
 */
function normalizeAggregationArgs(record: Record<string, unknown>): void {
  if (
    !("set" in record) &&
    !("remove" in record) &&
    !("restoreDefaults" in record) &&
    asRecord(record.aggregations)
  ) {
    record.set = record.aggregations;
    delete record.aggregations;
  }
  const next = spokenAggregationIds(record.set);
  if (next !== undefined) record.set = next;
}

function spokenAggregationIds(
  set: unknown
): Record<string, unknown> | undefined {
  const bag = asRecord(set);
  if (!bag) return undefined;
  const next = { ...bag };
  for (const [column, operation] of Object.entries(next)) {
    if (typeof operation !== "string") continue;
    const id = AGGREGATION_IDS[operation.trim().toLowerCase()];
    if (id) next[column] = id;
  }
  return next;
}

/** Spoken names a caller writes when the table takes the short id. */
const AGGREGATION_IDS: Readonly<Record<string, string>> = {
  average: "avg",
  mean: "avg",
  total: "sum",
};
