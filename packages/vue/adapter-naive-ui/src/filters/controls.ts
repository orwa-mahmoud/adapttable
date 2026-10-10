import type {
  DataTableClassNames,
  FilterCheckboxProps,
  FilterFieldSlots,
} from "@adapttable/vue/adapter";
import { NCheckbox } from "naive-ui";
import type { VNodeChild } from "vue";

import { naiveInput } from "../controls/input";
import { naiveSelect } from "../controls/select";
import { naiveElement } from "../renderers/nativeElement";

/** The kit owns checkbox paint and its value event; the filter model owns writes. */
export function naiveFilterCheckbox(
  control: FilterCheckboxProps,
  content: VNodeChild = control.label
) {
  return naiveElement(
    NCheckbox,
    {
      ...control.attrs,
      checked: control.checked,
      "aria-label": control.label,
      "aria-labelledby": control.attrs["aria-labelledby"] ?? undefined,
      "onUpdate:checked": (checked: boolean) => control.onChange(checked),
    },
    () => content
  );
}

export function naiveFilterControls(
  names: () => Pick<
    DataTableClassNames,
    "filterInput" | "filterOperator" | "filterSelect" | "filterCheckbox"
  >
): FilterFieldSlots {
  return {
    Input: (control) =>
      naiveInput({
        ...control,
        attrs: { ...control.attrs, class: names().filterInput },
      }),
    Select: (control) =>
      naiveSelect({
        ...control,
        attrs: {
          ...control.attrs,
          class:
            control.attrs["data-adapttable-part"] === "filter-operator"
              ? names().filterOperator
              : names().filterSelect,
        },
      }),
    Checkbox: (control) =>
      naiveFilterCheckbox({
        ...control,
        attrs: { ...control.attrs, class: names().filterCheckbox },
      }),
  };
}
