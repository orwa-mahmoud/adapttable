/**
 * The state seam between the optional density feature and the base shell.
 *
 * The key lives outside the feature implementation so the shell can read a
 * composed chooser without importing its provider or state hook.
 */

import {
  DENSITY_STATE,
  requestDensityChange,
  type ResolvedDensity,
  resolveDensity,
} from "@adapttable/core/binding";
import { useCallback } from "react";

import type { Density } from "../url/useDensityUrlState";
import { useFeatureState } from "./providers";

export {
  DENSITY_STATE,
  type DensityFeatureState,
  type ResolvedDensity,
} from "@adapttable/core/binding";

/**
 * Resolve controlled and feature-owned density through one adapter seam.
 *
 * The feature provider owns state only when composed. A callback without a
 * controlled value observes the internally applied change.
 *
 * @public
 */
export function useResolvedDensity(input: {
  readonly density?: Density;
  readonly onDensityChange?: (next: Density) => void;
}): ResolvedDensity {
  const state = useFeatureState(DENSITY_STATE);
  const controlledDensity = input.density;
  const controlled = controlledDensity !== undefined;
  const featureDensity = state?.density;
  const setFeatureDensity = state?.setDensity;
  const notify = input.onDensityChange;
  const onDensityChange = useCallback(
    (next: Density) => {
      requestDensityChange(next, {
        controlled,
        setFeatureDensity,
        onDensityChange: notify,
      });
    },
    [controlled, notify, setFeatureDensity]
  );
  return {
    density: resolveDensity(controlledDensity, featureDensity),
    onDensityChange,
  };
}
