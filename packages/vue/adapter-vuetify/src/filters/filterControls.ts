import type { FilterFieldSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import VuetifyCheckbox from "../controls/VuetifyCheckbox.vue";
import VuetifyInput from "../controls/VuetifyInput.vue";
import VuetifySelect from "../controls/VuetifySelect.vue";
import type { DataTableClassNames } from "../types";

/** Field labels and class hooks around the shared Vuetify control mapping. */
export function filterControls(
  names: () => DataTableClassNames
): FilterFieldSlots {
  return {
    Input: (control) =>
      h(VuetifyInput, {
        ...control,
        attrs: { ...control.attrs, class: names().filterInput },
      }),
    Select: (control) =>
      h(VuetifySelect, {
        ...control,
        attrs: {
          ...control.attrs,
          class:
            control.attrs["data-adapttable-part"] === "filter-operator"
              ? names().filterOperator
              : names().filterSelect,
        },
      }),
    Checkbox: (control) => {
      const { "data-adapttable-part": part, ...attrs } = control.attrs;
      return h(
        "label",
        {
          "data-adapttable-part": part,
          class: ["adapttable-vuetify-filter-checkbox", names().filterCheckbox],
        },
        [
          h(VuetifyCheckbox, {
            attrs,
            checked: control.checked,
            onChange: control.onChange,
          }),
          control.label,
        ]
      );
    },
  };
}
