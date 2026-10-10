import {
  type DataTableClassNames,
  type FilterFieldSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NuxtCheckbox from "../controls/NuxtCheckbox.vue";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtSelect from "../controls/NuxtSelect.vue";

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
      h(NuxtCheckbox, { control, className: names().filterCheckbox }),
  };
}
