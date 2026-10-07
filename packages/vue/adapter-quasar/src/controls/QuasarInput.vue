<script setup lang="ts">
import { QInput, type QInputProps } from "quasar";
import { computed, shallowRef, useId } from "vue";

import { quasarFieldAttrs, useQuasarControlRef } from "./controlAttrs";
import { useQuasarPresentation } from "./presentation";
import type { QuasarInputControl } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: QuasarInputControl;
  className?: string;
}>();
const input = shallowRef<InstanceType<typeof QInput> | null>(null);
const id = `adapttable-quasar-${useId()}`;
const attrs = computed(() => {
  const {
    class: className,
    style,
    ...rest
  } = quasarFieldAttrs(props.control.attrs);
  return {
    for: id,
    ...rest,
    "aria-label": props.control.label,
    inputClass: [className, props.className],
    inputStyle: style as QInputProps["inputStyle"],
  };
});
useQuasarControlRef(
  () => input.value?.nativeEl ?? null,
  () => props.control.attrs,
  () => props.control.focusRef
);
const { presentation, update } = useQuasarPresentation(
  () => props.control.value,
  (value) => props.control.onChange(value)
);
</script>

<template>
  <QInput
    ref="input"
    v-bind="attrs"
    :model-value="presentation"
    :type="control.type ?? 'text'"
    outlined
    dense
    hide-bottom-space
    @update:model-value="update"
  />
</template>
