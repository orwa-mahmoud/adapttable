<script setup lang="ts">
import { toVueAttrs } from "@adapttable/vue/adapter";
import UInput from "@nuxt/ui/components/Input.vue";
import {
  nextTick,
  onScopeDispose,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import type { NuxtInputControl } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: NuxtInputControl;
  className?: string;
}>();
const input = useTemplateRef<{ inputRef: HTMLInputElement | null }>("input");
const presentation = shallowRef(props.control.value);
let revision = 0;

watch(
  () => props.control.value,
  (value) => {
    presentation.value = value;
  }
);
watch(
  () => input.value?.inputRef ?? null,
  (element, previous) => {
    if (previous) props.control.focusRef?.(null);
    if (element) props.control.focusRef?.(element);
  },
  { flush: "post" }
);
onScopeDispose(() => {
  revision++;
  props.control.focusRef?.(null);
});

function update(value: unknown): void {
  const current = ++revision;
  presentation.value =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  props.control.onChange(presentation.value);
  // A rejected controlled request must repaint through the vendor's public
  // modelValue prop, without replacing the focused input or mutating its DOM.
  void nextTick(() => {
    if (current === revision) presentation.value = props.control.value;
  });
}
</script>

<template>
  <UInput
    ref="input"
    v-bind="toVueAttrs({ ...control.attrs, 'aria-label': control.label })"
    :model-value="presentation"
    :type="control.type ?? 'text'"
    :ui="{ base: className }"
    @update:model-value="update"
  />
</template>
