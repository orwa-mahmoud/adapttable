import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";

import AntdCheckbox from "./AntdCheckbox.vue";
import { isElementRef } from "./ref";

/** Parts/classes belong to the checkbox's label host; focus belongs to its input. */
export function antdSelectionCheckbox(
  control: SelectionCheckboxControl
): VNode {
  const {
    ref,
    "aria-label": label,
    ...attrs
  } = selectionCheckboxInputAttrs(control.attrs);
  return h(AntdCheckbox, {
    ...attrs,
    label: typeof label === "string" ? label : "",
    checked: control.checked,
    indeterminate: control.indeterminate,
    inputRef: isElementRef(ref) ? ref : undefined,
    onChange: control.onToggle,
  });
}
