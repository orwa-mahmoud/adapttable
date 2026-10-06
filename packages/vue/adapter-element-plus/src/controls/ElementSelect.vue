<script setup lang="ts">
import { ElOption, ElSelect, type SelectInstance } from "element-plus";
import { nextTick, shallowRef } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  value: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ change: [value: string] }>();
const control = shallowRef<SelectInstance>();
function change(value: unknown): void {
  if (typeof value === "string") emit("change", value);
  void nextTick(() => control.value?.$forceUpdate());
}
defineExpose({
  focus: () => control.value?.focus(),
  blur: () => control.value?.blur(),
});
</script>

<template>
  <ElSelect
    ref="control"
    v-bind="$attrs"
    :model-value="props.value"
    :disabled="props.disabled"
    :teleported="false"
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
