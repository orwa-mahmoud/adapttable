/**
 * Whether a value is a plain record: an object that is neither `null` nor
 * an array.
 *
 * @public
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
