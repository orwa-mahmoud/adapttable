import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { h } from "vue";

import AntdDensityControl from "./controls/AntdDensityControl.vue";

/** Ant Design Vue chooses the value; the binding owns density and URL state. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) => h(AntdDensityControl, { control }),
        },
      })
    ),
  ]);
}
