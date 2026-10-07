import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { h } from "vue";

import NuxtDensityControl from "./controls/NuxtDensityControl.vue";

/** Nuxt UI density control over the binding's controlled view model. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) => h(NuxtDensityControl, { control }),
        },
      })
    ),
  ]);
}
