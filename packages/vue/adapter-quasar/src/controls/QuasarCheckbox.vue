<script setup lang="ts">
import { QCheckbox } from "quasar";
import { computed, useTemplateRef } from "vue";

import { quasarAttrs, useQuasarControlRef } from "./controlAttrs";
import type { QuasarCheckboxControl } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: QuasarCheckboxControl;
  className?: string;
}>();
const checkbox = useTemplateRef<InstanceType<typeof QCheckbox>>("checkbox");
const attrs = computed(() =>
  Object.fromEntries(
    Object.entries(quasarAttrs(props.control.attrs)).filter(
      ([key]) =>
        !["checked", "indeterminate", "onChange", "onInput", "type"].includes(
          key
        )
    )
  )
);
useQuasarControlRef(
  () => {
    if (!checkbox.value) return null;
    const element: unknown = checkbox.value.$el;
    return element instanceof HTMLElement ? element : null;
  },
  () => props.control.attrs,
  () => props.control.focusRef
);
function update(value: unknown): void {
  props.control.onChange(value === true);
}
</script>

<template>
  <QCheckbox
    ref="checkbox"
    v-bind="attrs"
    :class="className"
    :model-value="control.indeterminate ? null : control.checked"
    :label="control.label"
    @update:model-value="update"
  />
</template>
