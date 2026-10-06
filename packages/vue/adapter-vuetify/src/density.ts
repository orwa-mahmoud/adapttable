import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/density";
import { h } from "vue";

import VuetifySelect from "./controls/VuetifySelect.vue";

/** The binding owns density state; Vuetify supplies the chooser. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            h(VuetifySelect, {
              attrs: control.attrs,
              value: control.value,
              options: control.options,
              onChange: (value) => {
                if (value === "comfortable" || value === "compact")
                  control.onChange(value);
              },
            }),
        },
      })
    ),
  ]);
}
