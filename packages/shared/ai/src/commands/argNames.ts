/**
 * Reading the argument names callers actually send.
 *
 * Guides name each argument, and models still reach for the near miss —
 * `column` for `key`, `search` for `query`. A command's `normalize` renames
 * the near miss before schema validation, so the table changes instead of the
 * receipt failing with "$.column is not allowed". Anything else is left for
 * validation to name.
 */
/** The value as a plain object, or `undefined`. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/** The first non-empty string among the named properties. */
export function pickString(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export function isString(value: unknown): boolean {
  return typeof value === "string";
}

export function isStringOrNull(value: unknown): boolean {
  return typeof value === "string" || value === null;
}

/**
 * Move `from` to `to` when the caller left `to` out and `from` holds a value
 * `to` can take.
 */
export function renameArg(
  record: Record<string, unknown>,
  from: string,
  to: string,
  accepts: (value: unknown) => boolean
): Record<string, unknown> {
  if (to in record || !accepts(record[from])) return record;
  record[to] = record[from];
  delete record[from];
  return record;
}

/**
 * `column` where the schema says `key`.
 *
 * Guides already say `key` not `column` for sort, group and pin. Models still
 * send `column`.
 */
export function columnAsKey(
  record: Record<string, unknown>
): Record<string, unknown> {
  return renameArg(record, "column", "key", isString);
}

/**
 * `key` where a row-addressing command means `rowKey`.
 *
 * The mirror of {@link columnAsKey}, and caused by it: sort, group and pin all
 * take a plain `key`, so a model that has learned this table's vocabulary
 * reaches for `key` when it wants to name a row too.
 */
export function keyAsRowKey(
  record: Record<string, unknown>
): Record<string, unknown> {
  return renameArg(record, "key", "rowKey", isString);
}
