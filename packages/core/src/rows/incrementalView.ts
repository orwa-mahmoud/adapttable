/**
 * WeakMap lookup for an incremental snapshot attached to a row array.
 *
 * Split from `incremental.ts` so a lean table can read aggregates without
 * importing the incremental engine.
 */

const VIEWS = new WeakMap<object, unknown>();

/**
 * The snapshot attached to a derived row array, if any.
 *
 * @public
 */
export function incrementalViewOf<TView>(
  rows: readonly unknown[]
): TView | undefined {
  return VIEWS.get(rows as object) as TView | undefined;
}

/**
 * Point a derived array at the snapshot it came from.
 *
 * @public
 */
export function attachIncrementalView(
  rows: readonly unknown[],
  view: unknown
): void {
  VIEWS.set(rows as object, view);
}
