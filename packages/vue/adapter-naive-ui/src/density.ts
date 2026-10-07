import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";

import { h } from "vue";

import { NaiveDensityControl } from "./controls/NaiveDensityControl";

/** Naive UI density chooser; the Vue binding owns state and persistence. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) => h(NaiveDensityControl, { ...control }),
        },
      })
    ),
  ]);
}
