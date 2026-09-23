/**
 * Default searchable-text projector: flatten a row's own values.
 *
 * Nested values are written as JSON, so a search can match text inside them.
 * A circular reference is left out and a BigInt is written as its digits, so
 * no row a host hands the table can make the default search throw.
 *
 * @public
 */
export function engineSearchText<TRow>(row: TRow): string {
  if (row && typeof row === "object") {
    const values: unknown[] = Object.values(row);
    return values
      .map((value) => {
        if (value == null) return "";
        if (typeof value === "object") return searchableJson(value);
        return searchableScalar(value);
      })
      .join(" ");
  }
  return String(row ?? "");
}

/** A scalar's text; a function or a symbol carries none a reader types. */
function searchableScalar(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "";
}

/**
 * `JSON.stringify` that never throws on data: BigInt becomes its digits, and
 * a value that contains itself is written once, not followed back in.
 */
function searchableJson(value: object): string {
  // The chain of objects from the root to the one being written. A value
  // already on it is a cycle; one seen elsewhere is only shared, and is written.
  const ancestors: unknown[] = [];
  return (
    JSON.stringify(
      value,
      function replace(this: unknown, _key: string, next: unknown): unknown {
        if (typeof next === "bigint") return next.toString();
        if (typeof next !== "object" || next === null) return next;
        while (ancestors.length > 0 && ancestors.at(-1) !== this) {
          ancestors.pop();
        }
        if (ancestors.includes(next)) return undefined;
        ancestors.push(next);
        return next;
      }
    ) ?? ""
  );
}
