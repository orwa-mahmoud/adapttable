import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";
import { h, normalizeClass, type VNode } from "vue";

import { nuxtControlSize } from "../densityContext";
import { nuxtCheckboxAttrs } from "./checkboxAttrs";

/** The model owns selection; each Nuxt model update requests exactly one toggle. */
export function nuxtSelection(control: SelectionCheckboxControl): VNode {
  const { class: className, ...attrs } = selectionCheckboxInputAttrs(
    control.attrs
  );
  return h(UCheckbox, {
    ...nuxtCheckboxAttrs(attrs),
    size: nuxtControlSize(),
    ui: { base: normalizeClass(className) },
    modelValue: control.indeterminate ? "indeterminate" : control.checked,
    "onUpdate:modelValue": control.onToggle,
  });
}
