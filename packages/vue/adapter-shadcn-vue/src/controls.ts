import type { Attrs } from "@adapttable/vue";
import {
  type DensityChooserSlots,
  type SelectionCheckboxControl,
  selectionCheckboxInputAttrs,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import { Minus } from "@lucide/vue";
import { h, type VNode } from "vue";

import { Button } from "./components/button";
import { Checkbox } from "./components/checkbox";
import { Input } from "./components/input";
import { NativeSelect, NativeSelectOption } from "./components/native-select";

/** Chrome callback refs are forwarded by each registry component to its target. */
export function shadcnControlAttrs(attrs: Attrs): Attrs {
  const callback = attrs.ref as ((element: Element | null) => void) | undefined;
  if (typeof callback !== "function") return attrs;
  return {
    ...Object.fromEntries(
      Object.entries(attrs).filter(([key]) => key !== "ref")
    ),
    elementRef: callback,
  };
}

export function shadcnButton({ attrs, label }: ViewControlButtonProps): VNode {
  return h(
    Button,
    { variant: "outline", ...shadcnControlAttrs(attrs) },
    () => label
  );
}

export function shadcnInput(control: {
  readonly attrs: Attrs;
  readonly value: string;
  readonly onChange: (value: string) => void;
}): VNode {
  return h(Input, {
    ...shadcnControlAttrs(control.attrs),
    modelValue: control.value,
    "onUpdate:modelValue": (value: string | number): void =>
      control.onChange(String(value)),
  });
}

export function shadcnSelect(control: {
  readonly attrs: Attrs;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
  }[];
  readonly onChange: (value: string) => void;
}): VNode {
  return h(
    NativeSelect,
    {
      ...shadcnControlAttrs(control.attrs),
      modelValue: control.value,
      "onUpdate:modelValue": (value: string | readonly string[]): void => {
        if (typeof value === "string") control.onChange(value);
      },
    },
    () =>
      control.options.map((option) =>
        h(
          NativeSelectOption,
          {
            key: option.value,
            value: option.value,
            selected: option.value === control.value,
            disabled: option.disabled,
          },
          () => option.label
        )
      )
  );
}

export const shadcnDensityControl: DensityChooserSlots["Control"] = (control) =>
  shadcnSelect({
    ...control,
    onChange: (value) => {
      if (value === "comfortable" || value === "compact")
        control.onChange(value);
    },
  });

/** One model-update event equals one selection request, including mixed state. */
export function shadcnSelectionCheckbox(
  control: SelectionCheckboxControl
): VNode {
  const attrs = Object.fromEntries(
    Object.entries(selectionCheckboxInputAttrs(control.attrs)).filter(
      ([key]) => key !== "type"
    )
  );
  return h(
    Checkbox,
    {
      ...shadcnControlAttrs(attrs),
      modelValue: control.indeterminate ? "indeterminate" : control.checked,
      "onUpdate:modelValue": control.onToggle,
    },
    control.indeterminate
      ? () => h(Minus, { class: "size-3.5", "aria-hidden": true })
      : undefined
  );
}

/** Native Select's multiple mode remains a controlled presentation value. */
export function shadcnMultiSelect(control: {
  readonly attrs: Attrs;
  readonly value: readonly string[];
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: readonly string[]) => void;
}): VNode {
  return h(
    NativeSelect,
    {
      ...shadcnControlAttrs(control.attrs),
      multiple: true,
      modelValue: control.value,
      "onUpdate:modelValue": (value: string | readonly string[]): void => {
        if (typeof value !== "string") control.onChange(value);
      },
    },
    () =>
      control.options.map((option) =>
        h(
          NativeSelectOption,
          {
            key: option.value,
            value: option.value,
            selected: control.value.includes(option.value),
          },
          () => option.label
        )
      )
  );
}
