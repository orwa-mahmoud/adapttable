/**
 * Percent-decode `value`, or return it as it is when it is not valid
 * percent-encoding: a value a reader typed is its own text.
 */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
