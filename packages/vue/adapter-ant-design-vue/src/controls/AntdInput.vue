<script setup lang="ts">
import { scheduleTick, useElementRef } from "@adapttable/vue/adapter";
import { Input, Textarea } from "ant-design-vue";
import {
  type ComponentPublicInstance,
  computed,
  type CSSProperties,
  shallowRef,
} from "vue";

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
const control = shallowRef<ComponentPublicInstance>();
/** The native field inside Ant Design Vue's input, whichever wrapper it draws. */
const input = computed((): HTMLInputElement | HTMLTextAreaElement | null => {
  const host: unknown = control.value?.$el;
  if (host == null) return null;
  if (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement)
    return host;
  if (!(host instanceof Element)) return null;
  return host.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea"
  );
});
/**
 * The host owns the value. Ant Design Vue leaves a rejected edit showing in
 * the field, so the field is set back to the value the host still holds once
 * the host has had its chance to accept the change.
 */
function change(value: string): void {
  emit("change", value);
  scheduleTick(() => {
    const field = input.value;
    if (field && field.value !== props.value) field.value = props.value;
  });
}
useElementRef(
  () => input.value,
  () => inputRef
);
defineExpose({ input, focus: () => input.value?.focus() });
</script>

<template>
  <Textarea
    v-if="type === 'textarea'"
    ref="control"
    v-bind="$attrs"
    :value="props.value"
    :disabled="disabled"
    :style="inputStyle"
    @update:value="change"
  />
  <Input
    v-else
    ref="control"
    v-bind="$attrs"
    :value="props.value"
    :type="type"
    :disabled="disabled"
    :style="inputStyle"
    @update:value="change"
  />
</template>
