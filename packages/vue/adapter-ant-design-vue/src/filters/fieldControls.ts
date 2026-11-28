import type {
  DataTableClassNames,
  FilterFieldSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";
import AntdInput from "../controls/AntdInput.vue";
import AntdSelect from "../controls/AntdSelect.vue";

export function antdFilterControls(
  names: () => DataTableClassNames
): FilterFieldSlots {
  return {
    Input: (control) =>
      h(AntdInput, {
        ...control.attrs,
        value: control.value,
        type: control.type,
        class: names().filterInput,
        onChange: control.onChange,
      }),
    Select: (control) =>
      h(AntdSelect, {
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
      h(AntdCheckbox, {
        ...control.attrs,
        checked: control.checked,
        label: control.label,
        labelVisible: true,
        class: names().filterCheckbox,
        onChange: control.onChange,
      }),
  };
}
