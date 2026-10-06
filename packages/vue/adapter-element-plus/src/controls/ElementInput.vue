<script setup lang="ts">
import { ElInput, type InputInstance } from "element-plus";
import { computed, type CSSProperties, mergeProps, shallowRef } from "vue";

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    value: string;
    type?:
      | "text"
      | "search"
      | "number"
      | "date"
      | "datetime-local"
      | "time"
      | "email"
      | "url"
      | "tel"
      | "textarea";
    disabled?: boolean;
    inputStyle?: CSSProperties;
  }>(),
  { type: "text", disabled: false, inputStyle: undefined }
);
const emit = defineEmits<{ change: [value: string] }>();
const control = shallowRef<InputInstance>();
const input = computed(() => control.value?.input ?? control.value?.textarea);
defineExpose({ input, focus: () => control.value?.focus() });
</script>

<template>
  <ElInput
    ref="control"
    v-bind="mergeProps($attrs, { value: props.value })"
    :model-value="props.value"
    :type="props.type"
    :disabled="props.disabled"
    :input-style="props.inputStyle"
    :validate-event="false"
    @update:model-value="emit('change', $event)"
  />
</template>
