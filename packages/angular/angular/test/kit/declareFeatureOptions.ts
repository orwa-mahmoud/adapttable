import type { AdaptTableFeature } from "@adapttable/angular";

/**
 * Write feature options onto the features a test already composed.
 *
 * The table reads these from the feature. The test keeps the values on the
 * host and this copies them across, including a later change.
 */
export function declareFeatureOptions(
  features: readonly AdaptTableFeature[],
  owned: Readonly<Record<string, Record<string, unknown>>>
): AdaptTableFeature[] {
  return features.map((feature) => {
    const patch = feature.id === undefined ? undefined : owned[feature.id];
    if (!patch) return feature;
    const apply = feature.apply?.bind(feature);
    return {
      ...feature,
      apply: (input) => ({ ...apply?.(input), ...patch }),
    };
  });
}
