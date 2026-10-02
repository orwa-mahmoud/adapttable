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
  DestroyRef,
  type EnvironmentProviders,
  InjectionToken,
  type Injector,
  makeEnvironmentProviders,
  type Type,
} from "@angular/core";

import type { FeatureMountContext } from "./featureLifecycle";

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

/** A feature's id, or its place in the list when it has none. */
function withIds(
  features: readonly AdaptTableFeature[]
): (AdaptTableFeature & { readonly id: string })[] {
  const byId = new Map<string, AdaptTableFeature & { readonly id: string }>();
  features.forEach((feature, index) => {
    const id = feature.id ?? `feature-${String(index)}`;
    byId.delete(id);
    byId.set(id, { ...feature, id });
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
 * The feature host for a table: every provided feature and every one the
 * table names, set up once and disposed with the injection context.
 */
export function featureHostFor(
  injector: Injector,
  own: readonly AdaptTableFeature[] | undefined
): FeatureHostState {
  const host = createFeatureHost(tableFeaturesOf(injector, own));
  injector.get(DestroyRef).onDestroy(() => {
    disposeFeatureHost(host);
  });
  return host;
}
