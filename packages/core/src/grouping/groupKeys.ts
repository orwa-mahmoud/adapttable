/**
 * The grouping keys, as a prop, as URL text, and as the list the model walks.
 *
 * Grouping travels as a comma-separated STRING — `?groupBy=team,status` — for
 * one reason: the URL and the source contract already carried a single key,
 * and a list that reads the same way keeps every link, saved view and
 * `source.setGroupBy` call ever written working. The array is what the model
 * and the adapters see; the string is what state is stored as.
 */

/**
 * How the grouping keys are written down: one key, a list, or nothing.
 *
 * @internal
 */
export type GroupByInput = string | readonly string[] | null | undefined;

/**
 * The grouping keys as a list, in order.
 *
 * Blank entries are dropped rather than grouped on: `"team,"` is a trailing
 * comma, not a request to group by a column with no name.
 *
 * @param value - The prop, the source value, or the URL parameter.
 * @returns The keys, possibly empty.
 *
 * @internal
 */
export function parseGroupBy(value: GroupByInput): string[] {
  if (value === null || value === undefined) return [];
  const list = typeof value === "string" ? value.split(",") : value;
  return list.map((key) => key.trim()).filter((key) => key.length > 0);
}

/**
 * The grouping keys as the single string state is stored as.
 *
 * @param value - The keys.
 * @returns The joined string, or `undefined` when nothing is grouped.
 *
 * @internal
 */
export function formatGroupBy(value: GroupByInput): string | undefined {
  const keys = parseGroupBy(value);
  return keys.length === 0 ? undefined : keys.join(",");
}
