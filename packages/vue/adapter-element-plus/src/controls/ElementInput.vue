<script setup lang="ts">
import { useElementRef } from "@adapttable/vue/adapter";
import { ElInput, type InputInstance } from "element-plus";
import { computed, type CSSProperties, mergeProps, shallowRef } from "vue";

defineOptions({ inheritAttrs: false });
const {
  type = "text",
  disabled = false,
  inputStyle = undefined,
  inputRef = undefined,
  ...props
} = defineProps<{
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
  inputRef?: (element: HTMLInputElement | HTMLTextAreaElement | null) => void;
}>();
const emit = defineEmits<{ change: [value: string] }>();
const control = shallowRef<InputInstance>();
const input = computed(() => control.value?.input ?? control.value?.textarea);
useElementRef(
  () => input.value,
  () => inputRef
);
defineExpose({ input, focus: () => control.value?.focus() });
</script>

<template>
  <ElInput
    ref="control"
    v-bind="mergeProps($attrs, { value: props.value })"
    :model-value="props.value"
    :type="type"
    :disabled="disabled"
    :input-style="inputStyle"
    :validate-event="false"
    @update:model-value="emit('change', $event)"
  />
</template>
