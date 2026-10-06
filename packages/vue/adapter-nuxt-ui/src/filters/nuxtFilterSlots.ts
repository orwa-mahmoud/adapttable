import {
  type DataTableClassNames,
  type FilterFieldSlots,
} from "@adapttable/vue/adapter";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";
import { h } from "vue";

import { nuxtCheckboxAttrs } from "../controls/checkboxAttrs";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtSelect from "../controls/NuxtSelect.vue";
import { nuxtControlSize } from "../densityContext";

export function nuxtFilterSlots(
  names: () => DataTableClassNames
): FilterFieldSlots {
  return {
    Input: (control) =>
      h(NuxtInput, { control, className: names().filterInput }),
    Select: (control) =>
      h(NuxtSelect, {
        control,
        className:
          control.attrs["data-adapttable-part"] === "filter-operator"
            ? names().filterOperator
            : names().filterSelect,
      }),
    Checkbox: (control) =>
      h(UCheckbox, {
        ...nuxtCheckboxAttrs(control.attrs),
        size: nuxtControlSize(),
        modelValue: control.checked,
        label: control.label,
        ui: { base: names().filterCheckbox },
        "onUpdate:modelValue": (value: unknown) =>
          control.onChange(value === true),
      }),
  };
}
