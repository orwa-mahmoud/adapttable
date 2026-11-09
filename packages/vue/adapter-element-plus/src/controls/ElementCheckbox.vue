<script setup lang="ts">
import {
  scheduleTick,
  useElementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { type CheckboxInstance, ElCheckbox } from "element-plus";
import { computed, shallowRef, watch } from "vue";

defineOptions({ inheritAttrs: false });
const {
  indeterminate = false,
  disabled = false,
  readonly = false,
  labelVisible = false,
  inputRef = undefined,
  ...props
} = defineProps<{
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  label: string;
  labelVisible?: boolean;
  inputRef?: (element: HTMLInputElement | null) => void;
}>();
const emit = defineEmits<{ change: [checked: boolean] }>();
const active = useScopeActivity();
let ownerGeneration = 0;
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
  () => inputRef
);
function reconcile(
  field = input.value,
  owner = inputRef,
  generation = ownerGeneration
): void {
  // A replacement control or activity session owns its own reconciliation.
  scheduleTick(() => {
    if (
      !field ||
      !active.value ||
      generation !== ownerGeneration ||
      input.value !== field ||
      inputRef !== owner ||
      !field.isConnected
    )
      return;
    field.checked = props.checked;
    field.indeterminate = indeterminate;
  });
}
watch(
  [active, input, () => inputRef],
  () => {
    ownerGeneration += 1;
    if (active.value) reconcile();
  },
  { flush: "sync" }
);
function requestChange(value: unknown): void {
  if (!active.value || disabled || readonly || typeof value !== "boolean")
    return;
  const field = input.value;
  const owner = inputRef;
  const generation = ownerGeneration;
  emit("change", value);
  // Let native activation finish before reconciling the controlled state.
  reconcile(field, owner, generation);
}
defineExpose({ input, focus: () => input.value?.focus() });
</script>

<template>
  <ElCheckbox
    ref="control"
    v-bind="$attrs"
    :model-value="props.checked"
    :indeterminate="indeterminate"
    :disabled="disabled || readonly"
    :validate-event="false"
    @update:model-value="requestChange"
  >
    <span
      :class="{
        'adapttable-element-plus-visually-hidden': !labelVisible,
      }"
      >{{ props.label }}</span
    >
  </ElCheckbox>
</template>
