/**
 * Percent-decode `value`, or return it as it is when it is not valid
 * percent-encoding: a value a reader typed is its own text.
 *
 * @param value - One percent-encoded URL part.
 * @returns The decoded text, or `value` itself when it does not decode.
 *
 * @public
 */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
