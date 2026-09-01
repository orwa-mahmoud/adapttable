/**
 * The state seam between the optional density feature and the base shell.
 *
 * The key lives outside the feature implementation so the shell can read a
 * composed chooser without importing its provider or state hook.
 */
import { useCallback } from "react";

import type { Density } from "../url/useDensityUrlState";
import { featureStateKey, useFeatureState } from "./providers";

/** State owned by a composed density chooser. */
export interface DensityFeatureState {
  /** The chooser's uncontrolled value. */
  readonly density: Density;
  /** Update the chooser's uncontrolled value. */
  readonly setDensity: (next: Density) => void;
}

/** Published only while the density chooser feature is composed. */
export const DENSITY_STATE =
  featureStateKey<DensityFeatureState>("density-chooser");

/** The density and request channel every adapter renders. */
export interface ResolvedDensity {
  /** Controlled value, feature-owned value, or the comfortable default. */
  readonly density: Density;
  /** Request a change; controlled tables wait for their prop to update. */
  readonly onDensityChange: (next: Density) => void;
}

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
      if (!controlled) setFeatureDensity?.(next);
      notify?.(next);
    },
    [controlled, notify, setFeatureDensity]
  );
  return {
    density: controlledDensity ?? featureDensity ?? "comfortable",
    onDensityChange,
  };
}
