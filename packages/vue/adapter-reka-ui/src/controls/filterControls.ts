import {
  type FilterCheckboxProps,
  type FilterInputProps,
  type FilterSelectProps,
} from "@adapttable/vue/adapter";
import { Label } from "reka-ui";
import { h } from "vue";

import { rekaInput } from "./basic";
import { rekaCheckbox } from "./checkbox";
import { rekaSelect } from "./select";

interface FilterClassNames {
  readonly filterInput?: string;
  readonly filterSelect?: string;
  readonly filterOperator?: string;
  readonly filterCheckbox?: string;
}

/** Compound checkbox label owns the styling part; CheckboxRoot owns state. */
export function rekaFilterControls(names: () => FilterClassNames) {
  return {
    Input: (control: FilterInputProps) =>
      rekaInput({
        ...control,
        attrs: { ...control.attrs, class: names().filterInput },
      }),
    Select: (control: FilterSelectProps) =>
      rekaSelect({
        ...control,
        attrs: {
          ...control.attrs,
          class:
            control.attrs["data-adapttable-part"] === "filter-operator"
              ? names().filterOperator
              : names().filterSelect,
        },
      }),
    Checkbox: (control: FilterCheckboxProps) => {
      const { "data-adapttable-part": part, ...attrs } = control.attrs;
      return h(
        Label,
        {
          "data-adapttable-part": part,
          class: ["at-reka-checkbox-label", names().filterCheckbox],
        },
        {
          default: () => [rekaCheckbox({ ...control, attrs }), control.label],
        },
      );
    },
  };
}
