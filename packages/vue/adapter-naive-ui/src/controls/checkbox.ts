import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { NCheckbox } from "naive-ui";
import { type VNode } from "vue";

import { naiveElement } from "../renderers/nativeElement";
import { withoutAttributes } from "./attributes";

/** NCheckbox's focusable root is its ARIA checkbox, not a native input. */
export function naiveCheckbox(control: SelectionCheckboxControl): VNode {
  const attrs = withoutAttributes(selectionCheckboxInputAttrs(control.attrs), [
    "type",
  ]);
  return naiveElement(NCheckbox, {
    ...attrs,
    checked: control.checked,
    indeterminate: control.indeterminate,
    "aria-labelledby": attrs["aria-labelledby"] ?? undefined,
    "aria-disabled": attrs.disabled ? true : undefined,
    "onUpdate:checked": () => control.onToggle(),
  });
}
