<script setup lang="ts">
import { useElementRef } from "@adapttable/vue/adapter";
import { type CheckboxInstance, ElCheckbox } from "element-plus";
import { computed, mergeProps, shallowRef } from "vue";

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    label: string;
    labelVisible?: boolean;
    inputRef?: (element: HTMLInputElement | null) => void;
  }>(),
  {
    indeterminate: false,
    disabled: false,
    readonly: false,
    labelVisible: false,
    inputRef: undefined,
  }
);
const emit = defineEmits<{ change: [checked: boolean] }>();
const control = shallowRef<CheckboxInstance>();
const input = computed((): HTMLInputElement | null => {
  const host: unknown = control.value?.$el;
  if (host == null) return null;
  if (!(host instanceof HTMLLabelElement))
    throw new Error(
      "AdaptTable: Element Plus checkbox must render its associated label host."
    );
  const field = host.control;
  if (!(field instanceof HTMLInputElement))
    throw new Error(
      "AdaptTable: Element Plus checkbox label must own an input."
    );
  return field;
});
useElementRef(
  () => input.value,
  () => props.inputRef
);
function requestChange(event: MouseEvent): void {
  const field = input.value;
  if (event.defaultPrevented || event.target !== field || !field) return;
  // Native checkbox pre-activation supplies the proposed value. Canceling its
  // default activation restores checked/mixed state when the host rejects the
  // request; accepted props are rendered by ElCheckbox's own v-model.
  event.preventDefault();
  if (!props.disabled && !props.readonly) emit("change", field.checked);
}
defineExpose({ input, focus: () => input.value?.focus() });
</script>

<template>
  <ElCheckbox
    ref="control"
    v-bind="mergeProps($attrs, { onClickCapture: requestChange })"
    :model-value="props.checked"
    :indeterminate="props.indeterminate"
    :disabled="props.disabled || props.readonly"
    :validate-event="false"
  >
    <span
      :class="{
        'adapttable-element-plus-visually-hidden': !props.labelVisible,
      }"
      >{{ props.label }}</span
    >
  </ElCheckbox>
</template>
