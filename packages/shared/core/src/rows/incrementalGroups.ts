/**
 * Grouping's read of an incremental snapshot.
 *
 * The snapshot lives in `incremental.ts`. Grouping asks this module for the
 * groups, so the grouping strategy does not import the cache itself.
 */
import {
  configureIncrementalView,
  hasIncrementalSnapshot,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewOf,
} from "./incremental";

/**
 * Grouping's snapshot for a row array, kept apart from the engine's.
 * `source` is the engine snapshot it was built from. `view` is the grouped
 * snapshot. Either one may be the view currently attached to the rows.
 */
const groupedSnapshots = new WeakMap<
  object,
  { source: object; view: IncrementalView<unknown> }
>();

/**
 * The groups on the snapshot attached to `rows`, after `patch` is applied.
 *
 * Absent when the array has no snapshot, and when the attached view is not
 * one {@link createIncrementalView} built. A basic engine attaches its own
 * view to the same array; grouping builds that model itself. An attached
 * snapshot with no groups returns `undefined` as well.
 */
export function configuredIncrementalGroups<TRow>(
  rows: readonly TRow[],
  patch: Partial<IncrementalViewConfig<TRow>>
): IncrementalView<TRow>["groups"] {
  const incremental = incrementalViewOf<TRow>(rows);
  if (!incremental || !hasIncrementalSnapshot(incremental)) return undefined;
  // The engine reattaches its own snapshot to these rows on every callback
  // refresh. Grouping's derived snapshot has to survive that, or a formatter
  // change recomputes every group aggregate.
  const cached = groupedSnapshots.get(rows);
  if (
    cached &&
    (cached.source === incremental || cached.view === incremental)
  ) {
    const next = configureIncrementalView(
      cached.view as IncrementalView<TRow>,
      patch
    );
    groupedSnapshots.set(rows, { source: cached.source, view: next });
    return next.groups;
  }
  const next = configureIncrementalView(incremental, patch);
  groupedSnapshots.set(rows, { source: incremental, view: next });
  return next.groups;
}
