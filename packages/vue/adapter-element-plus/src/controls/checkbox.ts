import type { SelectionCheckboxControl } from "@adapttable/vue/adapter";
import { selectionCheckboxInputAttrs } from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";

import ElementCheckbox from "./ElementCheckbox.vue";

/** Parts/classes belong to ElCheckbox's label host; focus belongs to its input. */
export function elementSelectionCheckbox(
  control: SelectionCheckboxControl
): VNode {
  const {
    ref,
    "aria-label": label,
    ...attrs
  } = selectionCheckboxInputAttrs(control.attrs);
  return h(ElementCheckbox, {
    ...attrs,
    label: typeof label === "string" ? label : "",
    checked: control.checked,
    indeterminate: control.indeterminate,
    inputRef: typeof ref === "function" ? (input) => ref(input) : undefined,
    onChange: control.onToggle,
  });
}
