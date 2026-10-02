/**
 * Feature composition through dependency injection: every feature provided
 * in an injector registers against each table created in it.
 */
import {
  createFeatureHost,
  disposeFeatureHost,
  type FeatureApplyInput,
  type FeatureHostState,
  type FeaturePatch,
  type FeatureRender,
  type FeatureSetup,
  mergeFeaturePatches,
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
  const byId = new Map<string, AdaptTableFeature & { readonly id: string }>();
  features.forEach((feature, index) => {
    const id = feature.id ?? `feature-${String(index)}`;
    byId.delete(id);
    if (feature.id !== undefined) {
      byId.set(id, feature as AdaptTableFeature & { readonly id: string });
      return;
    }
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
    byId.set(id, declaration);
  });
  return [...byId.values()];
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
): readonly AdaptTableFeature[] {
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
    equal: (left, right) =>
      left.length === right.length &&
      left.every((feature, index) => feature === right[index]),
  });
  let current:
    | {
        readonly host: FeatureHostState;
        readonly scope: ReturnType<typeof Injector.create>;
      }
    | undefined;
  const disposeCurrent = (): void => {
    const mounted = current;
    current = undefined;
    if (!mounted) return;
    const failures: unknown[] = [];
    try {
      disposeFeatureHost(mounted.host);
    } catch (error) {
      failures.push(error);
    }
    try {
      mounted.scope.destroy();
    } catch (error) {
      failures.push(error);
    }
    if (failures.length > 0)
      throw new AggregateError(failures, "Table feature setup cleanup failed");
  };
  const host = computed(() => {
    const list = features();
    return untracked(() => {
      disposeCurrent();
      const scope = Injector.create({ providers: [], parent: injector });
      try {
        const created = runInInjectionContext(scope, () =>
          createFeatureHost(list)
        );
        current = { host: created, scope };
        return created;
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
    });
  });
  effect(
    () => {
      host();
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(disposeCurrent);
  return host;
}
