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
import { RadioGroup, RadioGroupOption } from "@headlessui/vue";
import { h } from "vue";

/**
 * Headless UI's radio group reads ArrowLeft as "previous" in either
 * direction. In a right-to-left table that is the wrong way round, so the
 * arrows are swapped before the group sees them.
 */
let mirroring = false;
function mirrorArrows(event: KeyboardEvent): void {
  if (mirroring) return;
  let opposite: string;
  if (event.key === "ArrowLeft") opposite = "ArrowRight";
  else if (event.key === "ArrowRight") opposite = "ArrowLeft";
  else return;
  event.preventDefault();
  event.stopPropagation();
  mirroring = true;
  try {
    event.target?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: opposite,
        bubbles: true,
        cancelable: true,
      })
    );
  } finally {
    mirroring = false;
  }
}

const headlessDensityControl: DensityChooserSlots["Control"] = (control) =>
  h(
    RadioGroup,
    {
      ...toVueAttrs(control.attrs),
      ...(control.attrs.dir === "rtl"
        ? { onKeydownCapture: mirrorArrows }
        : {}),
      as: "div",
      class: [control.attrs.class, "at-headless-density"],
      modelValue: control.value,
      "onUpdate:modelValue": (value: unknown): void => {
        if (value === "compact" || value === "comfortable")
          control.onChange(value);
      },
    },
    () =>
      control.options.map((option) =>
        h(
          RadioGroupOption,
          {
            key: option.value,
            value: option.value,
            as: "button",
            type: "button",
            class: "at-headless-button at-headless-density-option",
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
        slots: { Control: headlessDensityControl },
      })
    ),
  ]);
}
