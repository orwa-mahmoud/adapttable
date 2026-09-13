/**
 * Accept the argument names models actually emit before schema validation.
 *
 * Guides already say `key` not `column` for sort, group and pin. Models
 * still send `column`. Rewriting here means the table changes instead of
 * every receipt failing with "$.column is not allowed".
 */

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

function normalizeDir(value: string): string {
  if (value === "descending" || value === "highest") return "desc";
  if (value === "ascending" || value === "lowest") return "asc";
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
  return record;
}

/**
 * Rewrite a capability argument bag into the schema the table published.
 *
 * Unknown keys and non-objects are left alone so validation still names them.
 */
export function normalizeCapabilityArgs(key: string, args: unknown): unknown {
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
  // And again: `setAggregations` taking `set` reads as a detail of this API,
  // while `aggregations` is the word the capability itself uses.
  if (
    key === "view.setAggregations" &&
    !("set" in record) &&
    !("remove" in record) &&
    !("restoreDefaults" in record) &&
    asRecord(record.aggregations)
  ) {
    record.set = record.aggregations;
    delete record.aggregations;
  }
  return record;
}
