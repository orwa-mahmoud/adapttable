import type {
  DataTableClassNames,
  FilterCheckboxProps,
  FilterInputProps,
  FilterSelectProps,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { Checkbox } from "./components/checkbox";
import { shadcnControlAttrs, shadcnInput, shadcnSelect } from "./controls";

interface InputControl extends Omit<FilterInputProps, "type"> {
  readonly type: FilterInputProps["type"] | "search";
  readonly className?: string;
}
interface SelectControl extends FilterSelectProps {
  readonly className?: string;
}

/** Field models and their callbacks remain owned by the Vue binding. */
export function shadcnFilterControls(names: () => DataTableClassNames) {
  return {
    Input: (control: InputControl) =>
      shadcnInput({
        ...control,
        attrs: {
          ...control.attrs,
          type: control.type,
          class: control.className ?? names().filterInput,
        },
      }),
    Select: (control: SelectControl) =>
      shadcnSelect({
        ...control,
        attrs: {
          ...control.attrs,
          class:
            control.className ??
            (control.attrs["data-adapttable-part"] === "filter-operator"
              ? names().filterOperator
              : names().filterSelect),
        },
      }),
    Checkbox: (control: FilterCheckboxProps) => {
      const { "data-adapttable-part": part, ...attrs } = control.attrs;
      return h(
        "label",
        {
          "data-adapttable-part": part,
          class: [
            "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm",
            names().filterCheckbox,
          ],
        },
        [
          h(Checkbox, {
            ...shadcnControlAttrs(attrs),
            modelValue: control.checked,
            "onUpdate:modelValue": (checked: boolean | "indeterminate") =>
              control.onChange(checked === true),
          }),
          control.label,
        ]
      );
    },
  };
}
