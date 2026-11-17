/**
 * The strings one table draws: the base strings every table draws, the
 * strings of the features it composed, then the host's own.
 */
import type { TableLabels } from "../types";
import { BASE_LABELS } from "./baseLabels";

const NO_FEATURES: readonly Partial<TableLabels>[] =
  /* @__PURE__ */ Object.freeze([]);
const BY_FEATURES = /* @__PURE__ */ new WeakMap<
  readonly Partial<TableLabels>[],
  Required<TableLabels>
>();

/**
 * Resolve a table's strings: the base strings, then each composed feature's
 * strings in order, then the host's overrides. A table that composes no
 * feature carries the base strings alone.
 *
 * Without overrides the result is shared: the same feature strings resolve
 * to the same object, so readers keyed on it do not see a change.
 *
 * @param overrides - The host's strings, any subset.
 * @param featureLabels - The strings of the composed features, in order.
 * @returns The table's strings.
 *
 * @public
 */
export function resolveTableLabels(
  overrides: TableLabels | undefined,
  featureLabels: readonly Partial<TableLabels>[] = NO_FEATURES
): Required<TableLabels> {
  if (overrides === undefined) {
    const shared = BY_FEATURES.get(featureLabels);
    if (shared !== undefined) return shared;
    const merged = merge(featureLabels, undefined);
    BY_FEATURES.set(featureLabels, merged);
    return merged;
  }
  return merge(featureLabels, overrides);
}

function merge(
  featureLabels: readonly Partial<TableLabels>[],
  overrides: TableLabels | undefined
): Required<TableLabels> {
  const merged: TableLabels = { ...BASE_LABELS };
  for (const labels of featureLabels) Object.assign(merged, labels);
  if (overrides)
    for (const key of Object.keys(overrides) as (keyof TableLabels)[]) {
      const value = overrides[key];
      if (value !== undefined) Object.assign(merged, { [key]: value });
    }
  // Every string a composed feature draws is present: the base strings and
  // each feature's own, which its factory declares.
  return merged as Required<TableLabels>;
}

/**
 * The keys a set of label groups names.
 *
 * @public
 */
export type GroupKeys<TGroups extends readonly Partial<TableLabels>[]> =
  Extract<
    { [I in keyof TGroups]: keyof TGroups[I] }[number],
    keyof TableLabels
  >;

/**
 * The strings a feature's own chrome draws: the base strings and the strings
 * of its groups, every one present.
 *
 * @public
 */
export type FeatureStrings<TGroups extends readonly Partial<TableLabels>[]> =
  Readonly<
    Pick<Required<TableLabels>, keyof typeof BASE_LABELS | GroupKeys<TGroups>>
  >;

/**
 * Resolve the strings a feature's chrome draws: the base strings, then the
 * feature's groups, then the labels it was handed. A chrome reads only what
 * its groups name, so a table carries no other feature's strings for it.
 *
 * Declare the groups once, at module scope, so a chrome handed no labels
 * shares one resolved object across renders.
 *
 * @param labels - The labels the chrome was handed, any subset.
 * @param groups - The feature's label groups.
 * @returns The chrome's strings.
 *
 * @public
 */
export function resolveFeatureLabels<
  const TGroups extends readonly Partial<TableLabels>[],
>(labels: TableLabels | undefined, groups: TGroups): FeatureStrings<TGroups> {
  return resolveTableLabels(labels, groups);
}
