import type {
  FilterCheckboxProps,
  FilterInputProps,
  FilterSelectProps,
} from "@adapttable/vue/filters";
import { h } from "vue";

import { nativeCheckbox } from "../nativeCheckbox";
import type { DataTableClassNames } from "../types";

/** Shared native field rendering, including controlled rejection rollback. */
interface NativeInputProps extends Omit<FilterInputProps, "type"> {
  readonly type: FilterInputProps["type"] | "search";
  readonly className?: string;
}
interface NativeSelectProps extends FilterSelectProps {
  readonly className?: string;
}
export function nativeFilterSlots(names: () => DataTableClassNames) {
  return {
    Input: (control: NativeInputProps) =>
      h("input", {
        ...control.attrs,
        type: control.type,
        value: control.value,
        class: control.className ?? names().filterInput,
        onInput: (event: Event) => {
          const element = event.currentTarget as HTMLInputElement;
          control.onChange(element.value);
          element.value = control.value;
        },
      }),
    Select: (control: NativeSelectProps) =>
      h(
        "select",
        {
          ...control.attrs,
          value: control.value,
          class:
            control.className ??
            (control.attrs["data-adapttable-part"] === "filter-operator"
              ? names().filterOperator
              : names().filterSelect),
          onChange: (event: Event) => {
            const element = event.currentTarget as HTMLSelectElement;
            control.onChange(element.value);
            element.value = control.value;
          },
        },
        control.options.map((option) =>
          h("option", { key: option.value, value: option.value }, option.label)
        )
      ),
    Checkbox: (control: FilterCheckboxProps) => {
      const { "data-adapttable-part": part, ...attrs } = control.attrs;
      return h(
        "label",
        {
          "data-adapttable-part": part,
          class: names().filterCheckbox,
        },
        [
          nativeCheckbox({
            ...attrs,
            type: "checkbox",
            checked: control.checked,
            onChange: (event: Event) =>
              control.onChange(
                (event.currentTarget as HTMLInputElement).checked
              ),
          }),
          control.label,
        ]
      );
    },
  };
}
