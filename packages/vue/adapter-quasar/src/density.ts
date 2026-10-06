import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { h } from "vue";

import QuasarSelect from "./controls/QuasarSelect.vue";

/** Quasar presentation for the binding-owned controlled density model. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            h(QuasarSelect, {
              control: {
                ...control,
                label:
                  typeof control.attrs["aria-label"] === "string"
                    ? control.attrs["aria-label"]
                    : "",
                onChange: (value: string) => {
                  if (value === "comfortable" || value === "compact")
                    control.onChange(value);
                },
              },
            }),
        },
      })
    ),
  ]);
}
