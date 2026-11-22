/**
 * The resources a table's features hold while they are composed.
 *
 * A feature's `mount` acquires something that outlives a render — a
 * subscription, a preload, a timer. The table keeps it by feature id, so an
 * ordinary change to the feature's options leaves it in place and hands it
 * the latest declaration; only removing the feature, dropping its `mount`,
 * changing its `dependencies` or disposing the table releases it, and each
 * acquisition is released exactly once.
 */
import { invokeCleanups } from "./featureRegistration";

/**
 * What {@link createFeatureMounts} reads from a feature declaration.
 *
 * @public
 */
export interface MountableFeature {
  /** Stable id; one resource per id. */
  readonly id: string;
  /** Values that, when any changes, replace the resource. */
  readonly dependencies?: readonly unknown[];
  /** Present when the feature holds a resource. */
  readonly mount?: unknown;
}

/**
 * Acquire one feature's resource.
 *
 * @param id - The feature id.
 * @param latest - The feature's current declaration, for the life of the
 *   resource.
 * @returns What releases it, or nothing to release.
 *
 * @public
 */
export type AcquireFeatureMount<TFeature> = (
  id: string,
  latest: () => TFeature
) => (() => void) | void;

/**
 * A table's mounted feature resources.
 *
 * @public
 */
export interface FeatureMounts<TFeature> {
  /**
   * Bring the resources in line with the composed features: release the
   * ones whose feature left, stopped mounting or changed its dependencies,
   * then acquire the new ones. When an acquisition fails, everything this
   * call acquired is released and the failure is thrown.
   */
  reconcile(features: readonly TFeature[]): void;
  /** The declaration a mounted feature currently reads. */
  current(id: string): TFeature | undefined;
  /** Release every resource once, newest first. Later calls do nothing. */
  dispose(): void;
}

interface Held<TFeature> {
  latest: TFeature;
  release: (() => void) | undefined;
}

function sameDependencies(
  left: readonly unknown[] | undefined,
  right: readonly unknown[] | undefined
): boolean {
  if (left === right) return true;
  if (left?.length !== right?.length) return false;
  return (left ?? []).every((value, index) => Object.is(value, right?.[index]));
}

function failWith(failures: readonly unknown[], message: string): void {
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, message);
}

/**
 * Keep a table's feature resources by id across recompositions.
 *
 * @param acquire - Acquires one feature's resource.
 * @returns The mounts, empty until the first {@link FeatureMounts.reconcile}.
 *
 * @public
 */
export function createFeatureMounts<TFeature extends MountableFeature>(
  acquire: AcquireFeatureMount<TFeature>
): FeatureMounts<TFeature> {
  const held = new Map<string, Held<TFeature>>();
  let disposed = false;

  const releaseIds = (ids: readonly string[]): readonly unknown[] => {
    const cleanups: (() => void)[] = [];
    for (const id of ids) {
      const entry = held.get(id);
      held.delete(id);
      if (entry?.release) cleanups.push(entry.release);
    }
    return invokeCleanups(cleanups);
  };

  const reconcile = (features: readonly TFeature[]): void => {
    if (disposed) return;
    const next = new Map(features.map((feature) => [feature.id, feature]));
    const leaving = [...held.entries()]
      .filter(([id, entry]) => {
        const upcoming = next.get(id);
        return (
          upcoming?.mount === undefined ||
          !sameDependencies(entry.latest.dependencies, upcoming.dependencies)
        );
      })
      .map(([id]) => id)
      .reverse();
    const releaseFailures = releaseIds(leaving);
    for (const [id, entry] of held) {
      const upcoming = next.get(id);
      if (upcoming) entry.latest = upcoming;
    }
    const acquired: string[] = [];
    try {
      for (const feature of features) {
        if (feature.mount === undefined || held.has(feature.id)) continue;
        const entry: Held<TFeature> = { latest: feature, release: undefined };
        held.set(feature.id, entry);
        acquired.push(feature.id);
        entry.release = acquire(feature.id, () => entry.latest) ?? undefined;
      }
    } catch (error) {
      const rollback = releaseIds([...acquired].reverse());
      failWith(
        [error, ...releaseFailures, ...rollback],
        "Feature mount failed and its rollback failed too"
      );
    }
    failWith(releaseFailures, "Feature cleanup failed");
  };

  return {
    reconcile,
    current: (id) => held.get(id)?.latest,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      failWith(
        releaseIds([...held.keys()].reverse()),
        "Feature cleanup failed"
      );
    },
  };
}

/**
 * One mount made of several, for a binding feature that adds its own mount
 * to the one its core feature brings: they run in order and release in
 * reverse, and a failing mount releases the ones before it.
 *
 * @param mounts - The mounts, absent ones skipped.
 * @returns The combined mount, or nothing when none is present.
 *
 * @public
 */
export function composeMounts<TContext>(
  ...mounts: readonly (
    ((context: TContext) => void | (() => void)) | undefined
  )[]
): ((context: TContext) => void | (() => void)) | undefined {
  const present = mounts.filter(
    (mount): mount is (context: TContext) => void | (() => void) =>
      mount !== undefined
  );
  if (present.length <= 1) return present[0];
  return (context) => {
    const releases: (() => void)[] = [];
    const releaseAll = (): readonly unknown[] =>
      invokeCleanups([...releases].reverse());
    try {
      for (const mount of present) {
        const release = mount(context);
        if (typeof release === "function") releases.push(release);
      }
    } catch (error) {
      failWith(
        [error, ...releaseAll()],
        "Feature mount failed and its rollback failed too"
      );
    }
    return () => {
      failWith(releaseAll(), "Feature cleanup failed");
    };
  };
}
