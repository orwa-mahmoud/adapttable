import type { FilterFieldSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";

/** Every interactive field is provided by the active Quasar kit. */
export const quasarFilterSlots: FilterFieldSlots = {
  Input: (control) => h(QuasarInput, { control }),
  Select: (control) => h(QuasarSelect, { control }),
  Checkbox: (control) => h(QuasarCheckbox, { control }),
};
