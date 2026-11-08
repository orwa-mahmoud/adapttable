/**
 * Whether two lists hold the same items in the same order, by identity.
 *
 * A host that builds an array inline hands over a new one on every render.
 * Comparing items rather than the arrays keeps that from reading as a change
 * and rebuilding what depends on it. Each item is compared with `Object.is`
 * and never looked inside, so the check stays O(n).
 *
 * @public
 */
export function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  if (Object.is(a, b)) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (!Object.is(a[index], b[index])) return false;
  }
  return true;
}

/**
 * `previous` when it holds the same items as `next`, otherwise `next`, so a
 * consumer keyed on the list's identity sees a change only when its items
 * change.
 *
 * @public
 */
export function retainItems<T>(
  previous: readonly T[] | undefined,
  next: readonly T[] | undefined
): readonly T[] | undefined {
  if (previous === undefined || next === undefined) return next;
  return sameItems(previous, next) ? previous : next;
}
