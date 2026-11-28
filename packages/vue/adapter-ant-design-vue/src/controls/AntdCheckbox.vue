<script setup lang="ts">
import {
  scheduleTick,
  useElementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Checkbox } from "ant-design-vue";
import { type ComponentPublicInstance, computed, shallowRef, watch } from "vue";

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
const control = shallowRef<ComponentPublicInstance>();
const input = computed((): HTMLInputElement | null => {
  const host: unknown = control.value?.$el;
  if (host == null) return null;
  if (!(host instanceof HTMLLabelElement))
    throw new Error(
      "AdaptTable: Ant Design Vue checkbox must render its associated label host."
    );
  const field = host.control;
  if (!(field instanceof HTMLInputElement))
    throw new Error(
      "AdaptTable: Ant Design Vue checkbox label must own an input."
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
// Ant Design Vue draws the mixed state with a class only, so the native
// property follows the controlled values here.
watch([() => props.checked, () => indeterminate], () => {
  if (active.value) reconcile();
});
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
  <Checkbox
    ref="control"
    v-bind="$attrs"
    :checked="props.checked"
    :indeterminate="indeterminate"
    :disabled="disabled || readonly"
    @update:checked="requestChange"
  >
    <span
      :class="{
        'adapttable-ant-design-vue-visually-hidden': !labelVisible,
      }"
      >{{ props.label }}</span
    >
  </Checkbox>
</template>
