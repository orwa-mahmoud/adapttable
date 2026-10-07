import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { h, normalizeClass, type VNode } from "vue";

import NuxtCheckbox from "./NuxtCheckbox.vue";

/** The model owns selection; each Nuxt model update requests exactly one toggle. */
export function nuxtSelection(control: SelectionCheckboxControl): VNode {
  const { class: className, ...attrs } = selectionCheckboxInputAttrs(
    control.attrs
  );
  return h(NuxtCheckbox, {
    control: {
      attrs,
      checked: control.indeterminate ? "indeterminate" : control.checked,
      onChange: control.onToggle,
    },
    className: normalizeClass(className),
  });
}
