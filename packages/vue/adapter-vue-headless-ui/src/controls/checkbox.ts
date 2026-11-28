import type { Attrs } from "@adapttable/vue";
import {
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "@adapttable/vue/adapter";
import { h, mergeProps } from "vue";

import { HeadlessPrimitive } from "./primitive";
import { headlessTarget } from "./target";

function checkedState(control: {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
}) {
  if (control.indeterminate) return "indeterminate";
  return control.checked ? "checked" : "unchecked";
}

function indicator(control: {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
}) {
  if (!control.checked && !control.indeterminate) return null;
  const mark = control.indeterminate ? "−" : "✓";
  return h(
    "span",
    { class: "at-headless-checkbox-indicator", "aria-hidden": true },
    mark
  );
}

/**
 * Headless UI for Vue has no checkbox, and its Switch cannot report a mixed
 * state, so the checkbox is a native button with the WAI-ARIA checkbox role.
 * The host owns the value; one click requests one change.
 */
export function headlessCheckbox(control: {
  readonly attrs: Attrs;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  const attrs = selectionCheckboxInputAttrs(control.attrs);
  const state = control.indeterminate ? "mixed" : control.checked;
  return headlessTarget(
    HeadlessPrimitive,
    mergeProps(attrs, {
      as: "button",
      type: "button",
      role: "checkbox",
      "aria-checked": state,
      "data-state": checkedState(control),
      class: "at-headless-checkbox",
      onClick: () => control.onChange(!control.checked),
      // A checkbox toggles on Space only; Enter is left to a surrounding form.
      onKeydown: (event: KeyboardEvent) => {
        if (event.key === "Enter") event.preventDefault();
      },
    }),
    {
      default: () => indicator(control),
    }
  );
}

/** One click requests one binding toggle, even if the host rejects it. */
export function headlessSelectionCheckbox(control: SelectionCheckboxControl) {
  return headlessCheckbox({
    ...control,
    onChange: control.onToggle,
  });
}
