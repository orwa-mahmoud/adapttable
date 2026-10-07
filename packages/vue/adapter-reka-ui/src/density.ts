import type { StaticTableFeature } from "@adapttable/vue";
import {
  DENSITY_CONTROL,
  DensityChooserChrome,
  type DensityChooserSlots,
  extendFeature,
  slotRender,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { densityChooser as bindingDensityChooser } from "@adapttable/vue/features";
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import { h } from "vue";

const rekaDensityControl: DensityChooserSlots["Control"] = (control) =>
  h(
    ToggleGroupRoot,
    {
      ...toVueAttrs(control.attrs),
      type: "single",
      orientation: "horizontal",
      class: [control.attrs.class, "at-reka-density"],
      modelValue: control.value,
      "onUpdate:modelValue": (value: unknown): void => {
        if (value === "compact" || value === "comfortable")
          control.onChange(value);
      },
    },
    () =>
      control.options.map((option) =>
        h(
          ToggleGroupItem,
          {
            key: option.value,
            value: option.value,
            class: "at-reka-button at-reka-density-option",
          },
          () => option.label
        )
      )
  );

export function densityChooser(): StaticTableFeature {
  return extendFeature(bindingDensityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: { Control: rekaDensityControl },
      })
    ),
  ]);
}
