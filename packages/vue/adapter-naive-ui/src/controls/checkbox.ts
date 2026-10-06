import type { ElementRef } from "@adapttable/vue";
import {
  elementRef,
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { NCheckbox } from "naive-ui";
import { h, type VNode } from "vue";

import { withoutAttributes } from "./attributes";
import { htmlRoot } from "./elementTarget";

/** NCheckbox's focusable root is its ARIA checkbox, not a native input. */
export function naiveCheckbox(control: SelectionCheckboxControl): VNode {
  const ref = control.attrs.ref;
  const attrs = withoutAttributes(selectionCheckboxInputAttrs(control.attrs), [
    "type",
    "ref",
  ]);
  return h(NCheckbox, {
    ...attrs,
    checked: control.checked,
    indeterminate: control.indeterminate,
    "aria-labelledby": attrs["aria-labelledby"] ?? undefined,
    "aria-disabled": attrs.disabled ? true : undefined,
    "onUpdate:checked": () => control.onToggle(),
    ref:
      typeof ref === "function"
        ? elementRef(ref as ElementRef, htmlRoot)
        : undefined,
  });
}
