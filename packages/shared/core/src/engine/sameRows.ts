import { sameItems } from "../utils/sameItems";

/**
 * Whether two row arrays are the same rows, by element identity.
 *
 * @deprecated Use {@link sameItems}, which compares any list the same way.
 * @public
 */
export function sameRows<TRow>(
  a: readonly TRow[],
  b: readonly TRow[]
): boolean {
  return sameItems(a, b);
}
