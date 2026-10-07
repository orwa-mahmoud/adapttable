import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  type DensityChooserSlots,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { h } from "vue";
import { VBtn } from "vuetify/components/VBtn";
import { VBtnToggle } from "vuetify/components/VBtnToggle";

const densityControl: DensityChooserSlots["Control"] = (control) =>
  h(
    VBtnToggle,
    {
      ...control.attrs,
      role: "group",
      modelValue: control.value,
      mandatory: true,
      divided: true,
      density: "comfortable",
      variant: "outlined",
      color: "primary",
      "onUpdate:modelValue": (value: unknown) => {
        if (value === "comfortable" || value === "compact")
          control.onChange(value);
      },
    },
    {
      default: () =>
        control.options.map((option) =>
          h(
            VBtn,
            {
              key: option.value,
              type: "button",
              value: option.value,
              active: option.value === control.value,
              "aria-pressed": option.value === control.value,
            },
            { default: () => option.label }
          )
        ),
    }
  );

/** The binding owns density state; Vuetify supplies the chooser. */
export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: { Control: densityControl },
      })
    ),
  ]);
}
