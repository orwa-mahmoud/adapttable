import type { Attrs } from "@adapttable/vue";
import {
  type FilterFieldSlots,
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { h, type VNode, type VNodeChild } from "vue";

import VuetifyButton from "./VuetifyButton.vue";
import VuetifyCheckbox from "./VuetifyCheckbox.vue";
import VuetifyInput from "./VuetifyInput.vue";
import VuetifySelect from "./VuetifySelect.vue";

export function vuetifyButton(attrs: Attrs, content: VNodeChild): VNode {
  return h(VuetifyButton, { attrs, content });
}

export function vuetifySelectionCheckbox(
  control: SelectionCheckboxControl
): VNode {
  return h(VuetifyCheckbox, {
    attrs: selectionCheckboxInputAttrs(control.attrs),
    checked: control.checked,
    indeterminate: control.indeterminate,
    onChange: control.onToggle,
  });
}

export const vuetifyFilterControls: FilterFieldSlots = {
  Input: ({ attrs, value, type, onChange }) =>
    h(VuetifyInput, { attrs, value, type, onChange }),
  Select: ({ attrs, value, options, onChange }) =>
    h(VuetifySelect, { attrs, value, options, onChange }),
  Checkbox: ({ attrs, checked, onChange }) =>
    h(VuetifyCheckbox, { attrs, checked, onChange }),
};
