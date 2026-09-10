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
  if (key === "view.setSort") return normalizeSortArgs(record);
  return record;
}
