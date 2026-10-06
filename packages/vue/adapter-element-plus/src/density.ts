import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { h } from "vue";

import ElementSelect from "./controls/ElementSelect.vue";

/** Element Plus chooses the value; the binding owns density and URL state. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            h(ElementSelect, {
              ...control.attrs,
              value: control.value,
              options: control.options,
              onChange: (value) => {
                if (value === "compact" || value === "comfortable")
                  control.onChange(value);
              },
            }),
        },
      })
    ),
  ]);
}
