<script setup lang="ts">
import { toVueAttrs } from "@adapttable/vue/adapter";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed, onScopeDispose, useTemplateRef, watch } from "vue";

import type { NuxtSelectControl } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: NuxtSelectControl;
  className?: string;
}>();
const select = useTemplateRef<{ triggerRef: HTMLButtonElement | null }>(
  "select"
);
// Reka reserves the empty string for clearing. Numeric presentation keys keep
// every model string, including an empty-string option, selectable unchanged.
const items = computed(() =>
  props.control.options.map((option, index) => ({
    label: option.label,
    value: index,
  }))
);
const selected = computed(() => {
  const index = props.control.options.findIndex(
    (option) => option.value === props.control.value
  );
  return index < 0 ? undefined : index;
});
watch(
  () => select.value?.triggerRef ?? null,
  (element, previous) => {
    if (previous) props.control.focusRef?.(null);
    if (element) props.control.focusRef?.(element);
  },
  { flush: "post" }
);
onScopeDispose(() => props.control.focusRef?.(null));
function update(index: unknown): void {
  if (typeof index !== "number") return;
  const option = props.control.options[index];
  if (option) props.control.onChange(option.value);
}
</script>

<template>
  <USelect
    ref="select"
    v-bind="toVueAttrs({ ...control.attrs, 'aria-label': control.label })"
    :items="items"
    :model-value="selected"
    :class="className"
    :portal="false"
    @update:model-value="update"
  />
</template>
