<script setup lang="ts">
import {
  type DensityChooserSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { ElRadioButton, ElRadioGroup } from "element-plus";
import { type ComponentPublicInstance, nextTick, watch } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: Parameters<DensityChooserSlots["Control"]>[0];
}>();
const active = useScopeActivity();
const fields = new Map<string, HTMLInputElement>();
let generation = 0;

function reconcile(): void {
  const ticket = generation;
  const owned = [...fields];
  void nextTick(() => {
    if (!active.value || ticket !== generation) return;
    for (const [value, field] of owned)
      if (fields.get(value) === field && field.isConnected)
        field.checked = value === props.control.value;
  });
}
function radioRef(
  value: string,
  instance: Element | ComponentPublicInstance | null
): void {
  if (instance === null) {
    fields.delete(value);
    return;
  }
  const host: unknown = "$el" in instance ? instance.$el : instance;
  if (
    !(host instanceof HTMLLabelElement) ||
    !(host.control instanceof HTMLInputElement)
  )
    throw new Error(
      "AdaptTable: Element Plus radio button must own a native input through its label."
    );
  fields.set(value, host.control);
  reconcile();
}
watch(
  active,
  () => {
    generation += 1;
    reconcile();
  },
  { flush: "sync" }
);
watch(() => props.control.value, reconcile);
function change(value: unknown): void {
  if (!active.value || (value !== "compact" && value !== "comfortable")) return;
  props.control.onChange(value);
  // Native radio activation unchecks its sibling before the host can reject.
  reconcile();
}
</script>

<template>
  <ElRadioGroup
    v-bind="props.control.attrs"
    :model-value="props.control.value"
    :validate-event="false"
    @update:model-value="change"
  >
    <ElRadioButton
      v-for="option in props.control.options"
      :key="option.value"
      :ref="(instance) => radioRef(option.value, instance)"
      :value="option.value"
      >{{ option.label }}</ElRadioButton
    >
  </ElRadioGroup>
</template>
