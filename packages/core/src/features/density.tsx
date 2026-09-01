/**
 * Density chooser — `@adapttable/<kit>/density`.
 *
 * The provider owns the chooser's uncontrolled value. A table that never
 * imports this feature never mounts or bundles that state.
 */
import { type ReactNode, useMemo, useState } from "react";

import type { Density } from "../url/useDensityUrlState";
import { DENSITY_STATE } from "./densityStateKey";
import { type FeatureProviderProps, FeatureStateScope } from "./providers";
import type { StaticTableFeature } from "./tableFeature";

function DensityProvider({
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const [density, setDensity] = useState<Density>("comfortable");
  const state = useMemo(() => ({ density, setDensity }), [density]);
  return (
    <FeatureStateScope stateKey={DENSITY_STATE} value={state}>
      {children}
    </FeatureStateScope>
  );
}

/**
 * Add a control that switches row density.
 *
 * Without a controlled `density` prop, the feature owns the choice and starts
 * at `"comfortable"`. `onDensityChange` observes requests in either mode.
 *
 * @public
 */
export function densityChooser(): StaticTableFeature {
  return {
    id: "density-chooser",
    apply: () => ({ densityChooser: true }),
    provider: { Provider: DensityProvider },
  };
}
