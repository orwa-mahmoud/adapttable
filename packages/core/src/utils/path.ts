/**
 * Safe dot-path lookup: `getPath(row, "department.name")`. Returns
 * `undefined` for any missing segment instead of throwing, so declarative
 * column keys can reach nested API payloads without optional-chaining
 * ceremony in user code. Also tolerates an empty/undefined `path` (returns
 * `undefined`) so a transiently-malformed column key can never crash a render.
 *
 * @public
 */
export function getPath(value: unknown, path: string): unknown {
  if (!path) return undefined;
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
