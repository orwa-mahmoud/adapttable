<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldSlots,
  useFilterField,
} from "@adapttable/vue/filters";
import { h } from "vue";

import { useClassNames } from "../classNamesContext";
import { nativeCheckbox } from "../nativeCheckbox";
defineOptions({ name: "NativeBasicFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useClassNames();
const model = useFilterField(() => props);
const controls: FilterFieldSlots = {
  Input: (control) =>
    h("input", {
      ...control.attrs,
      type: control.type,
      value: control.value,
      class: names.value.filterInput,
      onInput: (event: Event) => {
        const element = event.currentTarget as HTMLInputElement;
        control.onChange(element.value);
        element.value = control.value;
      },
    }),
  Select: (control) =>
    h(
      "select",
      {
        ...control.attrs,
        value: control.value,
        class:
          control.attrs["data-adapttable-part"] === "filter-operator"
            ? names.value.filterOperator
            : names.value.filterSelect,
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
  Checkbox: (control) => {
    const { "data-adapttable-part": part, ...attrs } = control.attrs;
    return h(
      "label",
      { "data-adapttable-part": part, class: names.value.filterCheckbox },
      [
        nativeCheckbox({
          ...attrs,
          type: "checkbox",
          checked: control.checked,
          onChange: (event: Event) => {
            control.onChange((event.currentTarget as HTMLInputElement).checked);
          },
        }),
        control.label,
      ]
    );
  },
};
const Render = () =>
  FilterFieldChrome({
    model: model.value,
    controls,
    classNames: names.value,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
