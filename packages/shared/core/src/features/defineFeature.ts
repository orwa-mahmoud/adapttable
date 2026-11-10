/**
 * One contract for a feature: what it adds to a table, with types.
 *
 * A feature declares the table options it sets, the store slices it adds and
 * the named actions it offers (item 5's table store), the labels it needs and
 * the URL params it owns. A table's feature list then types what the table
 * carries: {@link FeatureSlices} and {@link FeatureActions} are exactly the
 * slices and actions of the features installed, so a table without a feature
 * has neither its type nor its code.
 *
 * A feature built as a plain {@link PatchFeature} keeps working: the patch
 * layer reads `apply`, which a defined feature also has.
 */
import type { ActionDefinition, SliceKey } from "../state/tableStore";
import type { TableLabels } from "../types";
import type {
  FeatureApplyInput,
  FeaturePatch,
  PatchFeature,
} from "./featurePatch";

/** Store slices by name. */
export type FeatureSliceMap = Readonly<Record<string, SliceKey<unknown>>>;

/** The payload an action definition takes. */
export type ActionPayload<TAction> =
  TAction extends ActionDefinition<infer TPayload> ? TPayload : never;

/**
 * Named actions by name, each kept with its own payload type.
 *
 * @public
 */
export type FeatureActionMap<TActions> = {
  readonly [K in keyof TActions]: ActionDefinition<ActionPayload<TActions[K]>>;
};

/**
 * No slices or no actions: what a feature that declares none carries.
 *
 * @public
 */
export type NoFeatureState = Readonly<Record<never, never>>;

/**
 * What a feature declares.
 *
 * @typeParam TRow - The row type the feature works on.
 * @typeParam TSlices - The store slices it adds, by name.
 * @typeParam TActions - The named actions it offers, by name.
 *
 * @public
 */
export interface FeatureContract<
  TRow = unknown,
  TSlices extends FeatureSliceMap = NoFeatureState,
  TActions extends FeatureActionMap<TActions> = NoFeatureState,
> {
  /** Stable id (`"editing"`, `"grouping"`, a host plugin's name). */
  readonly id: string;
  /** The table options the feature sets, from the options before it. */
  readonly options?: (input: FeatureApplyInput<TRow>) => FeaturePatch<TRow>;
  /** The store slices the feature adds, by name. */
  readonly slices?: TSlices;
  /** The named actions the feature offers, by name. */
  readonly actions?: TActions;
  /** The strings the feature draws, with their English defaults. */
  readonly labels?: Partial<TableLabels>;
  /** The URL params the feature reads and writes. */
  readonly urlKeys?: readonly string[];
}

/**
 * A feature built from a {@link FeatureContract}: a {@link PatchFeature} the
 * patch layer composes, carrying its slices and actions with their types.
 *
 * @public
 */
export interface DefinedFeature<
  TRow = unknown,
  TSlices extends FeatureSliceMap = NoFeatureState,
  TActions extends FeatureActionMap<TActions> = NoFeatureState,
> extends PatchFeature<TRow> {
  /** The store slices the feature adds, by name. */
  readonly slices: TSlices;
  /** The named actions the feature offers, by name. */
  readonly actions: TActions;
  /** The strings the feature draws, with their English defaults. */
  readonly labels: Partial<TableLabels>;
  /** The URL params the feature reads and writes. */
  readonly urlKeys: readonly string[];
}

const NO_LABELS: Partial<TableLabels> = Object.freeze({});
const NO_KEYS: readonly string[] = Object.freeze([]);

/**
 * Define a feature.
 *
 * @param contract - What the feature adds to a table.
 * @returns The feature, ready to compose into a table's `features`.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineFeature<
  TRow = unknown,
  TSlices extends FeatureSliceMap = NoFeatureState,
  TActions extends FeatureActionMap<TActions> = NoFeatureState,
>(
  contract: FeatureContract<TRow, TSlices, TActions>
): DefinedFeature<TRow, TSlices, TActions> {
  const { options } = contract;
  return {
    id: contract.id,
    ...(options ? { apply: options } : {}),
    slices: contract.slices ?? ({} as TSlices),
    actions: contract.actions ?? ({} as TActions),
    labels: contract.labels ?? NO_LABELS,
    urlKeys: contract.urlKeys ?? NO_KEYS,
  };
}

/**
 * A union of types as one intersection of them.
 *
 * @public
 */
export type IntersectionOf<TUnion> = (
  TUnion extends unknown ? (part: TUnion) => void : never
) extends (all: infer TAll) => void
  ? TAll
  : never;

/**
 * The slices one feature adds; none for a plain patch feature.
 *
 * @public
 */
export type FeatureSlicesOf<TFeature> =
  TFeature extends DefinedFeature<never, infer TSlices>
    ? TSlices
    : NoFeatureState;

/**
 * The actions one feature offers; none for a plain patch feature.
 *
 * @public
 */
export type FeatureActionsOf<TFeature> =
  TFeature extends DefinedFeature<never, FeatureSliceMap, infer TActions>
    ? TActions
    : NoFeatureState;

/**
 * The store slices a table with these features carries: every installed
 * feature's slices, and no other feature's.
 *
 * @public
 */
export type FeatureSlices<TFeatures extends readonly unknown[]> =
  IntersectionOf<FeatureSlicesOf<TFeatures[number]>>;

/**
 * The named actions a table with these features offers: every installed
 * feature's actions, and no other feature's.
 *
 * @public
 */
export type FeatureActions<TFeatures extends readonly unknown[]> =
  IntersectionOf<FeatureActionsOf<TFeatures[number]>>;

/**
 * The slices and actions of a table's features, merged by name: a later
 * feature's entry wins, as it does for options.
 *
 * @param features - The table's features.
 * @returns Their slices and actions.
 *
 * @public
 */
export function featureState<const TFeatures extends readonly unknown[]>(
  features: TFeatures
): {
  readonly slices: FeatureSlices<TFeatures>;
  readonly actions: FeatureActions<TFeatures>;
} {
  const slices: Record<string, unknown> = {};
  const actions: Record<string, unknown> = {};
  for (const feature of features) {
    if (!isDefinedFeature(feature)) continue;
    Object.assign(slices, feature.slices);
    Object.assign(actions, feature.actions);
  }
  return {
    slices: slices as FeatureSlices<TFeatures>,
    actions: actions as FeatureActions<TFeatures>,
  };
}

/** Whether a feature was built with {@link defineFeature}. */
export function isDefinedFeature(
  feature: unknown
): feature is DefinedFeature<unknown, FeatureSliceMap, Record<string, never>> {
  return (
    typeof feature === "object" &&
    feature !== null &&
    "slices" in feature &&
    "actions" in feature &&
    "urlKeys" in feature
  );
}
