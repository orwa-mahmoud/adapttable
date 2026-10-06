import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";

import { naiveSelect } from "./controls/select";

/** Naive UI density chooser; the Vue binding owns state and persistence. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            naiveSelect({
              ...control,
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
