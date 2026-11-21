/**
 * Produce a deterministic string from any JSON-serialisable value so it
 * can be embedded in a query cache key (e.g. TanStack Query) without
 * changing identity on every render.
 *
 * Guarantees:
 * - Object keys are sorted by UTF-16 code unit, so `{ a, b }` and `{ b, a }`
 *   serialise identically, in any locale and whatever order keys arrive in.
 * - A value with `toJSON` (a `Date`) is read through it, as `JSON.stringify`
 *   reads it.
 * - Nested objects are normalised recursively.
 * - Array order is preserved (order is meaningful for lists).
 * - `undefined` values are dropped, mirroring how query strings and
 *   `JSON.stringify` already treat them.
 *
 * @param input - Any value. Functions/symbols are not supported and will
 *   serialise the way `JSON.stringify` handles them.
 * @returns A stable JSON string for the normalised input.
 *
 * @example
 * ```ts
 * stableKey({ b: 1, a: 2 }) === stableKey({ a: 2, b: 1 }); // true
 * ```
 *
 * @public
 */
export function stableKey(input: unknown): string {
  return JSON.stringify(normalize(input));
}

/** Code-unit order: total, and the same in every locale. */
function byCodeUnit(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function normalize(value: unknown, key = ""): unknown {
  if (value === null || typeof value !== "object") {
    return value === undefined ? undefined : value;
  }
  const json = (value as { toJSON?: unknown }).toJSON;
  if (typeof json === "function") {
    return normalize((json as (key: string) => unknown).call(value, key), key);
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => normalize(entry, String(index)));
  }
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(source).sort(byCodeUnit)) {
    const normalized = normalize(source[name], name);
    if (normalized !== undefined) {
      out[name] = normalized;
    }
  }
  return out;
}
