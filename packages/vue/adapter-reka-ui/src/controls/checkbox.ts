import type { Attrs } from "@adapttable/vue";
import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { h, mergeProps } from "vue";

import { targetAttrs } from "./target";

export function rekaCheckbox(control: {
  readonly attrs: Attrs;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  const attrs = selectionCheckboxInputAttrs(control.attrs);
  const state = control.indeterminate ? "indeterminate" : control.checked;
  return h(
    CheckboxRoot,
    mergeProps(targetAttrs(attrs), {
      as: "button",
      type: "button",
      class: "at-reka-checkbox",
      modelValue: state,
      "onUpdate:modelValue": (value: boolean | "indeterminate") =>
        control.onChange(value === true),
    }),
    {
      default: () =>
        h(
          CheckboxIndicator,
          { class: "at-reka-checkbox-indicator" },
          {
            default: () => (control.indeterminate ? "−" : "✓"),
          },
        ),
    },
  );
}

/** One Reka model event requests one binding toggle, even if rejected. */
export function rekaSelectionCheckbox(control: SelectionCheckboxControl) {
  return rekaCheckbox({
    ...control,
    onChange: control.onToggle,
  });
}
