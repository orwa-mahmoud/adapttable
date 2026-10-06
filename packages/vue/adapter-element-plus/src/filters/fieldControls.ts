import type {
  DataTableClassNames,
  FilterFieldSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import ElementCheckbox from "../controls/ElementCheckbox.vue";
import ElementInput from "../controls/ElementInput.vue";
import ElementSelect from "../controls/ElementSelect.vue";

export function elementFilterControls(
  names: () => DataTableClassNames
): FilterFieldSlots {
  return {
    Input: (control) =>
      h(ElementInput, {
        ...control.attrs,
        value: control.value,
        type: control.type,
        class: names().filterInput,
        onChange: control.onChange,
      }),
    Select: (control) =>
      h(ElementSelect, {
        ...control.attrs,
        value: control.value,
        options: control.options,
        class:
          control.attrs["data-adapttable-part"] === "filter-operator"
            ? names().filterOperator
            : names().filterSelect,
        onChange: control.onChange,
      }),
    Checkbox: (control) =>
      h(ElementCheckbox, {
        ...control.attrs,
        checked: control.checked,
        label: control.label,
        labelVisible: true,
        class: names().filterCheckbox,
        onChange: control.onChange,
      }),
  };
}
