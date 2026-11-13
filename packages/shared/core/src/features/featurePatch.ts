/**
 * The feature patch layer — how a `features` array becomes table options.
 *
 * Every composed feature may `apply` a patch of internal configuration. The
 * patches merge in array order (later features win), `assembly` merges one
 * level deep so two features can each contribute assembly functions, and a
 * defined host option wins over every feature. The strings the features draw
 * ride along as `featureLabels`. The result forgets
 * `features` and remembers which list produced it, and resolving an already
 * resolved object is a no-op — so a kit and the shell can both apply.
 *
 * The binding adds what it draws (providers, slot renders) on its own
 * feature type; the merge is the same for every binding, so it lives here.
 */
import type { TableLabels } from "../types";
import {
  type GroupingContribution,
  mergeGroupingContributions,
  projectGroupingContribution,
} from "./featureContribution";
import type { FeatureRegistration } from "./featureRegistration";

/**
 * Internal table configuration a composed feature may write.
 *
 * @public
 */
export interface FeaturePatch<TRow = unknown> {
  /** Any other option a feature wants to set on the table. */
  readonly [key: string]: unknown;
  /**
   * Phantom marker that pins the row type; never read at runtime.
   *
   * A FUNCTION of the row rather than the row itself, so a feature whose
   * configuration says nothing about rows (`TRow = unknown`) fits every
   * table, while one built for the wrong row still fails to compose.
   */
  readonly __row?: (row: TRow) => void;
}

/**
 * The table options a feature may read while applying: the patch the
 * features before it produced.
 *
 * @public
 */
export type FeatureApplyInput<TRow = unknown> = object & {
  /** Phantom marker that pins the row type; never read at runtime. */
  readonly __row?: TRow;
};

/**
 * A composed feature as the patch layer sees it: an id and an optional
 * `apply`. A binding's feature type extends this with what it draws.
 *
 * @public
 */
export interface PatchFeature<
  TRow = unknown,
> extends FeatureRegistration<TRow> {
  /** Merge this feature's configuration into the table. Later features win. */
  apply?(input: FeatureApplyInput<TRow>): FeaturePatch<TRow>;
  /** The strings the feature draws, with their English defaults. */
  readonly labels?: Partial<TableLabels>;
}

interface LabelListNode {
  readonly next: WeakMap<object, LabelListNode>;
  list?: readonly Partial<TableLabels>[];
}

const LABEL_LISTS: LabelListNode = { next: /* @__PURE__ */ new WeakMap() };
const NO_FEATURE_LABELS: readonly Partial<TableLabels>[] =
  /* @__PURE__ */ Object.freeze([]);

/**
 * The strings a table's composed features draw, in composition order.
 *
 * The same sequence of label sets returns the same list, so a host that
 * builds its `features` inline on every render does not re-resolve its
 * table's strings. Each step is keyed weakly on a label set.
 *
 * @param features - The composed features.
 * @returns Each feature's strings, for {@link resolveTableLabels}.
 *
 * @public
 */
export function featureLabelsOf(
  features: readonly PatchFeature<never>[] | undefined
): readonly Partial<TableLabels>[] {
  const labels: Partial<TableLabels>[] = [];
  let node = LABEL_LISTS;
  for (const feature of features ?? []) {
    if (feature.labels === undefined) continue;
    labels.push(feature.labels);
    let child = node.next.get(feature.labels);
    if (child === undefined) {
      child = { next: new WeakMap() };
      node.next.set(feature.labels, child);
    }
    node = child;
  }
  if (labels.length === 0) return NO_FEATURE_LABELS;
  node.list ??= labels;
  return node.list;
}

const applied = /* @__PURE__ */ new WeakSet<object>();
const appliedFeatures = /* @__PURE__ */ new WeakMap<
  object,
  readonly PatchFeature[]
>();

/**
 * The feature list that produced this resolved options object, if any.
 *
 * @param options - An object {@link applyTableFeatures} returned.
 * @returns The list, or `undefined` when the object was never resolved.
 *
 * @public
 */
export function getAppliedFeatures<
  TFeature extends PatchFeature = PatchFeature,
>(options: object): readonly TFeature[] | undefined {
  return appliedFeatures.get(options) as readonly TFeature[] | undefined;
}

/**
 * Remember the feature list on a resolved (or overlaid) options object.
 *
 * @param options - The resolved object.
 * @param list - The features that produced it.
 *
 * @public
 */
export function rememberAppliedFeatures(
  options: object,
  list: readonly PatchFeature[]
): void {
  appliedFeatures.set(options, list);
}

function definedEntries(value: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && key !== "__row") out[key] = entry;
  }
  return out;
}

function omitFeatures<P extends object>(options: P): P {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (key !== "features") rest[key] = value;
  }
  return rest as P;
}

function featuresOf(options: object): readonly PatchFeature[] | undefined {
  if (!("features" in options)) return undefined;
  const list = options.features;
  if (!Array.isArray(list)) return [];
  return list as readonly PatchFeature[];
}

/**
 * Merge every feature's patch, in order. Later features win; `assembly`
 * merges one level deep rather than being replaced.
 *
 * @param list - The composed features.
 * @returns The merged patch, `undefined` entries dropped.
 *
 * @public
 */
export function mergeFeaturePatches(
  list: readonly PatchFeature<never>[]
): Record<string, unknown> {
  let fromFeatures: Record<string, unknown> = {};
  for (const next of list) {
    const patch = next.apply?.(fromFeatures);
    if (!patch) continue;
    const entries = definedEntries(patch);
    const prevAssembly = fromFeatures.assembly;
    const nextAssembly = entries.assembly;
    fromFeatures = { ...fromFeatures, ...entries };
    if (
      prevAssembly &&
      nextAssembly &&
      typeof prevAssembly === "object" &&
      typeof nextAssembly === "object"
    ) {
      fromFeatures.assembly = { ...prevAssembly, ...nextAssembly };
    }
  }
  return fromFeatures;
}

/**
 * Lay a table's own options over what its features set: a defined host option
 * wins over every feature's patch, and the features' strings ride along as
 * `featureLabels` when there are any.
 *
 * Feature patches are untyped option bags, so this is the one place their
 * merge takes the host options' type: the host's defined values win, which
 * keeps every option the host typed at its type.
 *
 * @param patches - The features' merged patches ({@link mergeFeaturePatches}).
 * @param featureLabels - The features' strings ({@link featureLabelsOf}).
 * @typeParam TOptions - The host's options.
 * @typeParam TResolved - The options the table reads: the host's, plus the
 *   keys its features set.
 * @param options - The host's own options.
 * @returns The options the table reads.
 *
 * @public
 */
export function overlayFeatureOptions<
  TOptions extends object,
  TResolved extends TOptions = TOptions,
>(
  patches: Readonly<Record<string, unknown>>,
  featureLabels: readonly Partial<TableLabels>[],
  options: TOptions
): TResolved {
  const resolved: Record<string, unknown> = {
    ...patches,
    ...(featureLabels.length > 0 ? { featureLabels } : {}),
    ...definedEntries(options),
  };
  return resolved as TResolved;
}

/**
 * Resolve `features` onto the existing option surface.
 *
 * Later features win; defined host options win over both. `features` is
 * stripped from the result. Calling twice on the same object is a no-op.
 *
 * @param options - Table options that may carry a `features` array.
 * @returns The resolved options.
 *
 * @public
 */
export function applyTableFeatures<P extends object>(options: P): P {
  if (applied.has(options)) return options;

  const list = featuresOf(options);
  if (list == null) {
    applied.add(options);
    return options;
  }
  if (list.length === 0) {
    const rest = omitFeatures(options);
    applied.add(rest);
    rememberAppliedFeatures(rest, list);
    return rest;
  }

  const resolved = overlayFeatureOptions(
    mergeFeaturePatches(list),
    featureLabelsOf(list),
    omitFeatures(options)
  );
  applied.add(resolved);
  rememberAppliedFeatures(resolved, list);
  return resolved;
}

/**
 * Resolve grouping contributions with the same precedence as
 * {@link applyTableFeatures}.
 *
 * Later features win. A defined host contribution wins over every feature.
 * Undefined entries are skipped. The winner is returned as itself.
 *
 * @param host - The host's own grouping, when it published one.
 * @param features - Grouping each feature contributed, in array order.
 * @returns The contribution the runtime view projects.
 *
 * @public
 */
export function resolveFeatureGrouping<TRow>(
  host: GroupingContribution<TRow> | undefined,
  features: readonly (GroupingContribution<TRow> | undefined)[]
): GroupingContribution<TRow> | undefined {
  return projectGroupingContribution({
    host,
    feature: mergeGroupingContributions(features),
  });
}
