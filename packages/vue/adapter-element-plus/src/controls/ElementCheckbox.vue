<script setup lang="ts">
import { useElementRef, useScopeActivity } from "@adapttable/vue/adapter";
import { type CheckboxInstance, ElCheckbox } from "element-plus";
import { computed, nextTick, shallowRef, watch } from "vue";

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
  () => props.inputRef
);
function reconcile(
  field = input.value,
  owner = props.inputRef,
  generation = ownerGeneration
): void {
  // A replacement control or activity session owns its own reconciliation.
  void nextTick(() => {
    if (
      !field ||
      !active.value ||
      generation !== ownerGeneration ||
      input.value !== field ||
      props.inputRef !== owner ||
      !field.isConnected
    )
      return;
    field.checked = props.checked;
    field.indeterminate = props.indeterminate;
  });
}
watch(
  [active, input, () => props.inputRef],
  () => {
    ownerGeneration += 1;
    if (active.value) reconcile();
  },
  { flush: "sync" }
);
function requestChange(value: unknown): void {
  if (
    !active.value ||
    props.disabled ||
    props.readonly ||
    typeof value !== "boolean"
  )
    return;
  const field = input.value;
  const owner = props.inputRef;
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
    :indeterminate="props.indeterminate"
    :disabled="props.disabled || props.readonly"
    :validate-event="false"
    @update:model-value="requestChange"
  >
    <span
      :class="{
        'adapttable-element-plus-visually-hidden': !props.labelVisible,
      }"
      >{{ props.label }}</span
    >
  </ElCheckbox>
</template>
