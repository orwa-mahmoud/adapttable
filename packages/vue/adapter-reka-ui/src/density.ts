import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";

import { rekaSelect } from "./controls/select";

export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            rekaSelect({
              ...control,
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
