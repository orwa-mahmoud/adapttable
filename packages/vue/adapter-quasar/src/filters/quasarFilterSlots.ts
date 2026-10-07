import type {
  DataTableClassNames,
  FilterFieldSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";

/** Every interactive field is provided by the active Quasar kit. */
export function createQuasarFilterSlots(
  names: () => DataTableClassNames
): FilterFieldSlots {
  return {
    Input: (control) =>
      h(QuasarInput, { control, className: names().filterInput }),
    Select: (control) =>
      h(QuasarSelect, {
        control,
        className:
          control.attrs["data-adapttable-part"] === "filter-operator"
            ? names().filterOperator
            : names().filterSelect,
      }),
    Checkbox: (control) =>
      h(QuasarCheckbox, { control, className: names().filterCheckbox }),
  };
}
export const quasarFilterSlots: FilterFieldSlots = createQuasarFilterSlots(
  () => ({})
);
