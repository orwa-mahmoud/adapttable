import type { StaticTableFeature } from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  DENSITY_CONTROL,
  densityChooser as bindingDensityChooser,
  DensityChooserChrome,
} from "@adapttable/vue/density";

import { nativeDensityControl } from "./viewControls/nativeControls";

/** Native density chooser; the binding owns state and URL synchronization. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: { Control: nativeDensityControl },
      })
    ),
  ]);
}
