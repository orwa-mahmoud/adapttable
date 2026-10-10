<script setup lang="ts" generic="TRow">
import type { ChecklistFilterProps } from "@adapttable/core/binding";
import {
  ChecklistChrome,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import { nativeCheckbox } from "../nativeCheckbox";

/** Native controls for the binding-owned searchable, windowed checklist. */
defineOptions({ name: "NativeChecklistFilter" });
const props = defineProps<ChecklistFilterProps<TRow>>();
const model = useChecklistModel(() => props);
const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h("input", {
      type: "search",
      value: control.value,
      "aria-label": control.label,
      "data-adapttable-part": "filter-checklist-search",
      class: control.className,
      onInput: (event: Event) => {
        const element = event.currentTarget as HTMLInputElement;
        control.onChange(element.value);
        element.value = control.value;
      },
    }),
  Button: (control) =>
    h("button", { type: "button", onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    h(
      "label",
      {
        "data-adapttable-part": "filter-checkbox",
        class: control.className,
      },
      [
        nativeCheckbox({
          type: "checkbox",
          checked: control.checked,
          onChange: (event: Event) => {
            control.onChange((event.currentTarget as HTMLInputElement).checked);
          },
        }),
        control.label,
        h(
          "span",
          {
            class: control.countClassName,
            "data-adapttable-part": "filter-checklist-count",
          },
          control.count
        ),
      ]
    ),
};
const Render = () => ChecklistChrome({ model: model.value, controls });

// An explicit empty props list preserves all root attributes through this render component.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
