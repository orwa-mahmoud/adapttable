/**
 * Produce a deterministic string from any JSON-serialisable value so it
 * can be embedded in a query cache key (e.g. TanStack Query) without
 * changing identity on every render.
 *
 * Guarantees:
 * - Object keys are sorted, so `{ a, b }` and `{ b, a }` serialise
 *   identically.
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

function normalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value === undefined ? undefined : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry));
  }

  const source = value as Record<string, unknown>;
  // Locale-pinned sort keeps the key identical across user locales while
  // staying lexicographic on UTF-16 code units.
  const keys = Object.keys(source).sort((a, b) => a.localeCompare(b, "en"));
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const normalized = normalize(source[key]);
    if (normalized !== undefined) {
      out[key] = normalized;
    }
  }
  return out;
}
