<script setup lang="ts">
import { ElOption, ElSelect, type SelectInstance } from "element-plus";
import { nextTick, shallowRef } from "vue";

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    value: string;
    options: readonly { value: string; label: string }[];
    disabled?: boolean;
    teleported?: boolean;
    appendTo?: HTMLElement | string;
  }>(),
  { disabled: false, teleported: false, appendTo: undefined }
);
const emit = defineEmits<{ change: [value: string] }>();
const control = shallowRef<SelectInstance>();
function change(value: unknown): void {
  if (typeof value === "string") emit("change", value);
  void nextTick(() => control.value?.$forceUpdate());
}
// A parent ref resolves before this template ref does, so a focus requested
// while the select mounts waits a tick for it.
function focus(): void {
  if (control.value) control.value.focus();
  else void nextTick(() => control.value?.focus());
}
defineExpose({
  focus,
  blur: () => control.value?.blur(),
});
</script>

<template>
  <ElSelect
    ref="control"
    v-bind="$attrs"
    :model-value="props.value"
    :disabled="props.disabled"
    :teleported="props.teleported"
    :append-to="props.appendTo"
    :validate-event="false"
    @update:model-value="change"
  >
    <ElOption
      v-for="option in props.options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
    />
  </ElSelect>
</template>
