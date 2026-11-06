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
  return configureIncrementalView(incremental, patch).groups;
}
