import { coreDensityChooser, DENSITY_STATE } from "@adapttable/core/binding";
import { toValue, watch } from "vue";

import { useDensityUrlState } from "../url/useDensityUrlState";
import { DENSITY_CONTROL } from "../viewControls/contracts";
import type { FeatureMountContext, StaticTableFeature } from "./tableFeature";

function mountDensity<TRow>(context: FeatureMountContext<TRow>): void {
  const density = useDensityUrlState(
    () => ({
      urlAdapter: context.urlAdapter,
      urlSync: true,
      serverSearch: () =>
        toValue(context.options.value.urlAdapter)?.getSearch() ?? "",
      urlKey: context.options.value.urlKey,
      defaultDensity: context.options.value.defaultDensity,
    }),
    context.active
  );
  context.registerViewStateFlush(density.flush);
  watch(
    density.density,
    (value) => {
      context.state.set(DENSITY_STATE, {
        density: value,
        setDensity: density.onDensityChange,
      });
    },
    { immediate: true, flush: "sync" }
  );
}

/** Add a kit-native chooser. Controlled table density always wins. */
export function densityChooser(): StaticTableFeature {
  return {
    ...coreDensityChooser(),
    mount: mountDensity,
    requiredSlots: [DENSITY_CONTROL],
  };
}
