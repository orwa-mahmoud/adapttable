/**
 * Registration, conflict and cleanup shared by every binding.
 *
 * The host that collects `setup` stays {@link LiveFeatureHost}. This module
 * decides which declarations survive, which retained features are the same
 * one, and how those hosts read as one table. A binding still owns its
 * injector, effect scope or hook, and it still decides the order in which it
 * releases them.
 */
import type { FeatureHostState } from "./currentHost";
import { LiveFeatureHost } from "./liveFeatureHost";

/**
 * Live engine a neutral plugin may register against.
 *
 * @public
 */
export interface NeutralFeatureHost<TRow = unknown> {
  /** Forget a registration when the table is disposed or features change. */
  onDispose(cleanup: () => void): void;
  /**
   * Phantom marker that pins the row type; never read at runtime.
   */
  readonly __row?: (row: TRow) => void;
}

/**
 * Neutral plugin: id, operators, cleanup. No React configuration bags.
 *
 * @public
 */
export interface FeatureRegistration<TRow = unknown> {
  /** Stable id (`"row-reorder"`, `"grouping"`, a host plugin's name). */
  readonly id: string;
  /**
   * Phantom so a registration can name its row type without a React host.
   */
  readonly __row?: (row: TRow) => void;
}

/**
 * One feature a table is about to register or already registered.
 *
 * @typeParam TFeature - The binding's feature declaration.
 *
 * @public
 */
export interface RegisteredFeature<TFeature> {
  /** The feature's id after the binding has assigned one. */
  readonly id: string;
  /** The declaration. */
  readonly feature: TFeature;
}

/**
 * What changed between the features a table holds and the list it was just given.
 *
 * @typeParam TFeature - The binding's feature declaration.
 *
 * @public
 */
export interface FeatureRegistrationPlan<TFeature> {
  /**
   * Ids to release, in the retained order the caller passed. A caller that
   * wants the opposite order passes its retained list reversed.
   */
  readonly release: readonly string[];
  /** Declarations that are not already the retained feature for their id. */
  readonly mount: readonly RegisteredFeature<TFeature>[];
}

/**
 * Keep the last declaration of each id.
 *
 * The winner moves to the position of its last occurrence. Earlier ids stay
 * in the order their own winner appeared. A discarded declaration is absent,
 * so its `apply` and `setup` do not run.
 *
 * @param features - The composed features, in the order the host wrote them.
 * @returns The declarations that own their ids.
 *
 * @public
 */
export function preferLastById<TFeature extends { readonly id: string }>(
  features: readonly TFeature[]
): readonly TFeature[] {
  const byId = new Map<string, TFeature>();
  for (const feature of features) {
    byId.delete(feature.id);
    byId.set(feature.id, feature);
  }
  return [...byId.values()];
}

/**
 * Decide which retained features stay and which declarations still have to mount.
 *
 * `same` is the binding's persistence check: object identity, or identity plus
 * the dependencies it retains. This function does not sort and does not call
 * `setup`. Two entries with one id collapse to the last before the comparison.
 *
 * @param retained - Features already mounted, in the order the binding releases.
 * @param next - The next declarations. Each one has the id the binding assigned.
 * @param same - Whether the retained feature is still that declaration.
 * @returns The ids to release and the declarations to mount.
 *
 * @public
 */
export function planFeatureRegistration<TFeature>(
  retained: readonly RegisteredFeature<TFeature>[],
  next: readonly RegisteredFeature<TFeature>[],
  same: (current: TFeature, next: TFeature) => boolean
): FeatureRegistrationPlan<TFeature> {
  const resolved = preferLastById(next);
  const upcoming = new Map(resolved.map((entry) => [entry.id, entry]));
  const release: string[] = [];
  const kept = new Set<string>();
  for (const entry of retained) {
    const candidate = upcoming.get(entry.id);
    if (candidate && same(entry.feature, candidate.feature)) {
      kept.add(entry.id);
    } else {
      release.push(entry.id);
    }
  }
  return {
    release,
    mount: resolved.filter((entry) => !kept.has(entry.id)),
  };
}

/**
 * One readable host from the hosts each feature registered on.
 *
 * Arrays follow the order of `hosts`. A later feature's editor or aggregator
 * name replaces an earlier one. Cleanups stay on the feature hosts; disposing
 * the projection does not release them.
 *
 * @param hosts - The per-feature hosts, in read order.
 * @returns The host a table reads.
 *
 * @public
 */
export function projectFeatureHosts<TRow>(
  hosts: readonly FeatureHostState<TRow>[]
): LiveFeatureHost<TRow> {
  const combined = new LiveFeatureHost<TRow>();
  for (const part of hosts) {
    combined.filterTypes.push(...part.filterTypes);
    combined.filterExtends.push(...part.filterExtends);
    for (const [key, value] of part.editors) combined.editors.set(key, value);
    for (const [key, value] of part.aggregators)
      combined.aggregators.set(key, value);
    combined.writers.push(...part.writers);
    combined.columnMenuActions.push(...part.columnMenuActions);
    combined.panels.push(...part.panels);
    combined.commands.push(...part.commands);
    combined.contextMenuItems.push(...part.contextMenuItems);
  }
  return combined;
}

/**
 * Run every cleanup. A failure is recorded and the rest still run.
 *
 * @param cleanups - The cleanups, in the order the binding chose.
 * @returns The failures, in the order they were thrown.
 *
 * @public
 */
export function invokeCleanups(
  cleanups: readonly (() => void)[]
): readonly unknown[] {
  const failures: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}
