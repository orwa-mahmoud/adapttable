import {
  type FilterCheckboxProps,
  type FilterInputProps,
  type FilterSelectProps,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessInput } from "./basic";
import { headlessCheckbox } from "./checkbox";
import { HeadlessLabel } from "./primitive";
import { headlessSelect } from "./select";

interface FilterClassNames {
  readonly filterInput?: string;
  readonly filterSelect?: string;
  readonly filterOperator?: string;
  readonly filterCheckbox?: string;
}

/** Compound checkbox label owns the styling part; CheckboxRoot owns state. */
export function headlessFilterControls(names: () => FilterClassNames) {
  return {
    Input: (control: FilterInputProps) =>
      headlessInput({
        ...control,
        attrs: { ...control.attrs, class: names().filterInput },
      }),
    Select: (control: FilterSelectProps) =>
      headlessSelect({
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
        HeadlessLabel,
        {
          "data-adapttable-part": part,
          class: ["at-headless-checkbox-label", names().filterCheckbox],
        },
        {
          default: () => [
            headlessCheckbox({ ...control, attrs }),
            control.label,
          ],
        }
      );
    },
  };
}
