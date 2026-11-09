/**
 * Feature composition through dependency injection: every feature provided
 * in an injector registers against each table created in it.
 */
import {
  createFeatureHost,
  disposeFeatureHost,
  EMPTY_FEATURE_HOST,
  type FeatureApplyInput,
  type FeatureHostState,
  type FeaturePatch,
  type FeatureRender,
  type FeatureSetup,
  type FeatureStateKey,
  mergeFeaturePatches,
  planFeatureRegistration,
  preferLastById,
  projectFeatureHosts,
  sameItems,
  type SidePanelEntry,
  type SlotFill,
  slotFillsOf,
} from "@adapttable/core/binding";
import {
  computed,
  DestroyRef,
  effect,
  type EnvironmentProviders,
  InjectionToken,
  Injector,
  makeEnvironmentProviders,
  runInInjectionContext,
  type Signal,
  type Type,
  untracked,
} from "@angular/core";

import type { FeatureMountContext } from "./featureLifecycle";
import { type MaybeSignalOptional, readMaybe } from "./store";

/**
 * What a slot draws in Angular: a standalone component that takes the slot's
 * props through one `props` input.
 *
 * @public
 */
export type SlotComponent = Type<unknown>;

/**
 * A feature a table composes. Any of three parts, all optional:
 *
 * - `apply` merges the feature's configuration into the table's — what turns
 *   the column menu or the density chooser on;
 * - `setup` registers filter types, editors, aggregators, writers, commands
 *   or menu entries against the live table;
 * - `renders` names the slots the feature draws into and the component that
 *   draws each one, which is how a kit puts its own controls in the table.
 *
 * @public
 */
export interface AdaptTableFeature extends FeatureSetup<
  unknown,
  SidePanelEntry
> {
  /** Stable id: `"column-menu"`, `"density-chooser"`, a plugin's name. */
  readonly id?: string;
  /** Merge this feature's configuration into the table. Later features win. */
  apply?(input: FeatureApplyInput<never>): FeaturePatch<unknown>;
  /** The slots this feature draws into, and what draws each one. */
  readonly renders?: readonly FeatureRender<never, SlotComponent>[];
  /** Start live behavior once the table runtime exists; dispose with the table. */
  mount?(context: FeatureMountContext): void | (() => void);
  /**
   * The code this feature brings to the table, by key. The table reaches a
   * feature's code only through a composed feature, so a table never bundles
   * the code of a feature it was not given.
   */
  readonly implementations?: Readonly<Record<string, unknown>>;
}

/**
 * A feature that brings `implementation` for `key`.
 *
 * @param feature - The feature to extend.
 * @param key - The implementation's key.
 * @param implementation - The code the table runs for this feature.
 * @returns The feature with the implementation filed under the key.
 *
 * @public
 */
export function withFeatureImplementation<
  TFeature extends {
    readonly id?: string;
    readonly implementations?: Readonly<Record<string, unknown>>;
  },
  T,
>(feature: TFeature, key: FeatureStateKey<T>, implementation: T): TFeature {
  return {
    ...feature,
    implementations: { ...feature.implementations, [key.id]: implementation },
  };
}

/**
 * The implementation the composed features bring for `key`; a later feature
 * wins.
 *
 * @param features - The composed features.
 * @param key - The implementation's key.
 * @returns The implementation, or `undefined` when no feature brings one.
 *
 * @public
 */
export function featureImplementation<T>(
  features: readonly AdaptTableFeature[],
  key: FeatureStateKey<T>
): T | undefined {
  for (let index = features.length - 1; index >= 0; index -= 1) {
    const implementation = features[index]?.implementations?.[key.id];
    if (implementation !== undefined) return implementation as T;
  }
  return undefined;
}

/**
 * A feature with more slots filled: the base's own renders, then these. A
 * kit extends a core feature with its components this way.
 *
 * @param base - The feature to extend.
 * @param renders - The slots to add, from `slotRender`.
 * @returns The extended feature.
 *
 * @public
 */
export function extendFeature(
  base: AdaptTableFeature,
  renders: readonly FeatureRender<never, SlotComponent>[]
): AdaptTableFeature {
  return { ...base, renders: [...(base.renders ?? []), ...renders] };
}

/** Anonymous declarations keep their identity when the host replaces only its array. */
const anonymousFeatures = new WeakMap<
  AdaptTableFeature,
  Map<string, AdaptTableFeature & { readonly id: string }>
>();

/** A feature's id, or its place in the list when it has none. */
function withIds(
  features: readonly AdaptTableFeature[]
): (AdaptTableFeature & { readonly id: string })[] {
  return [
    ...preferLastById(
      features.map((feature, index) => identified(feature, index))
    ),
  ];
}

function identified(
  feature: AdaptTableFeature,
  index: number
): AdaptTableFeature & { readonly id: string } {
  if (feature.id !== undefined) {
    return feature as AdaptTableFeature & { readonly id: string };
  }
  const id = `feature-${String(index)}`;
  let resolved = anonymousFeatures.get(feature);
  if (!resolved) {
    resolved = new Map();
    anonymousFeatures.set(feature, resolved);
  }
  let declaration = resolved.get(id);
  if (!declaration) {
    declaration = { ...feature, id };
    resolved.set(id, declaration);
  }
  return declaration;
}

/**
 * The configuration every feature's `apply` merges, in order — what a kit
 * reads before its table exists, such as the filter definitions its data
 * tier needs.
 *
 * @param features - The composed features.
 * @returns The merged configuration.
 *
 * @public
 */
export function featureOptionsOf(
  features: readonly AdaptTableFeature[]
): Readonly<Record<string, unknown>> {
  return mergeFeaturePatches(withIds(features));
}

/**
 * Which components draw each slot, ordered by feature id.
 *
 * @internal
 */
export function featureSlotFillsOf(
  features: readonly AdaptTableFeature[]
): ReadonlyMap<string, readonly SlotFill<SlotComponent>[]> {
  return slotFillsOf(withIds(features));
}

/**
 * The features every table in this injector composes. Multi-provided: each
 * {@link provideAdaptTableFeatures} call adds to the list.
 *
 * @public
 */
export const ADAPTTABLE_FEATURES = new InjectionToken<
  readonly AdaptTableFeature[]
>("ADAPTTABLE_FEATURES");

/**
 * Provide features to every table created under this injector — in
 * `bootstrapApplication`, a route's `providers`, or a component's.
 *
 * @param features - The features.
 * @returns The providers.
 *
 * @public
 */
export function provideAdaptTableFeatures(
  ...features: readonly AdaptTableFeature[]
): EnvironmentProviders {
  return makeEnvironmentProviders(
    features.map((feature) => ({
      provide: ADAPTTABLE_FEATURES,
      useValue: feature,
      multi: true,
    }))
  );
}

/**
 * Resolve provided features before the table's own features. Duplicate ids
 * resolve to the last declaration, consistently for setup, apply and slots.
 *
 * @public
 */
export function tableFeaturesOf(
  injector: Injector,
  own: readonly AdaptTableFeature[] | undefined
): readonly (AdaptTableFeature & { readonly id: string })[] {
  const provided =
    injector.get(ADAPTTABLE_FEATURES, null, { optional: true }) ?? [];
  return withIds([...provided, ...(own ?? [])]);
}

/**
 * The feature host for a live composition. Setup follows core's host
 * lifecycle: changed members receive a fresh host, and the old host disposes.
 */
export function featureHostFor(
  injector: Injector,
  own: MaybeSignalOptional<readonly AdaptTableFeature[]> | undefined
): Signal<FeatureHostState> {
  const features = computed(() => tableFeaturesOf(injector, readMaybe(own)), {
    equal: sameItems,
  });
  interface OwnedSetup {
    readonly feature: AdaptTableFeature & { readonly id: string };
    readonly host: FeatureHostState;
    readonly scope: ReturnType<typeof Injector.create>;
  }
  const owned = new Map<string, OwnedSetup>();
  let published: FeatureHostState = EMPTY_FEATURE_HOST;
  let disposed = false;
  const releaseIds = (ids: readonly string[]): void => {
    const failures: unknown[] = [];
    for (const id of ids) {
      const entry = owned.get(id);
      owned.delete(id);
      if (!entry) continue;
      try {
        disposeFeatureHost(entry.host);
      } catch (error) {
        failures.push(error);
      }
      try {
        entry.scope.destroy();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0)
      throw new AggregateError(failures, "Table feature setup cleanup failed");
  };
  const mountOne = (
    feature: AdaptTableFeature & { readonly id: string }
  ): OwnedSetup => {
    const scope = Injector.create({ providers: [], parent: injector });
    try {
      const created = runInInjectionContext(scope, () =>
        createFeatureHost([feature])
      );
      return { feature, host: created, scope };
    } catch (error) {
      try {
        scope.destroy();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Table feature setup and cleanup failed"
        );
      }
      throw error;
    }
  };
  const projectOwned = (): FeatureHostState => {
    const parts = [...owned.values()]
      .map((entry) => entry.host)
      .filter((host) => host !== EMPTY_FEATURE_HOST);
    return parts.length === 0 ? EMPTY_FEATURE_HOST : projectFeatureHosts(parts);
  };
  const discardPending = (
    pending: ReadonlyMap<string, OwnedSetup>,
    error: unknown
  ): never => {
    const failures: unknown[] = [error];
    const created = [...pending.values()];
    created.reverse();
    for (const entry of created) {
      try {
        disposeFeatureHost(entry.host);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
      try {
        entry.scope.destroy();
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (failures.length > 1)
      throw new AggregateError(
        failures,
        "Table feature setup and cleanup failed"
      );
    throw error;
  };
  const remember = (pending: ReadonlyMap<string, OwnedSetup>): void => {
    for (const [id, entry] of pending) owned.set(id, entry);
  };
  const syncComposition = (
    list: readonly (AdaptTableFeature & { readonly id: string })[]
  ): FeatureHostState => {
    if (disposed) return published;
    const next = list.map((feature) => ({ id: feature.id, feature }));
    const retainedIds = [...owned.keys()];
    retainedIds.reverse();
    const retained = retainedIds.map((id) => {
      const entry = owned.get(id);
      if (!entry) throw new Error("Missing retained feature");
      return { id, feature: entry.feature };
    });
    const plan = planFeatureRegistration(retained, next, Object.is);
    const pending = new Map<string, OwnedSetup>();
    try {
      for (const entry of plan.mount)
        pending.set(entry.id, mountOne(entry.feature));
    } catch (error) {
      discardPending(pending, error);
    }
    try {
      releaseIds(plan.release);
    } catch (error) {
      remember(pending);
      published = projectOwned();
      throw error;
    }
    remember(pending);
    if (plan.release.length > 0 || plan.mount.length > 0)
      published = projectOwned();
    return published;
  };
  const host = computed(() => {
    const list = features();
    return untracked(() => syncComposition(list));
  });
  const disposeOwned = (): void => {
    if (disposed) return;
    disposed = true;
    releaseIds([...owned.keys()].reverse());
    published = EMPTY_FEATURE_HOST;
  };
  effect(
    () => {
      host();
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(disposeOwned);
  return host;
}
