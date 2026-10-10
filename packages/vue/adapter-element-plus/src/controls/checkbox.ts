import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";

import ElementCheckbox from "./ElementCheckbox.vue";
import { isElementRef } from "./ref";

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
    inputRef: isElementRef(ref) ? ref : undefined,
    onChange: control.onToggle,
  });
}
