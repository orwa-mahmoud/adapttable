<script setup lang="ts">
import { toVueAttrs } from "@adapttable/vue/adapter";
import UInput from "@nuxt/ui/components/Input.vue";
import { nextTick, onScopeDispose, shallowRef, watch } from "vue";

import { useNuxtControlSize } from "../densityContext";
import { controlRef, withoutAttrs } from "./attrs";
import type { NuxtInputControl } from "./types";
import { useControlElementRef } from "./useControlElementRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: NuxtInputControl;
  className?: string;
}>();
const input = shallowRef<{ inputRef: HTMLInputElement | null } | null>(null);
const size = useNuxtControlSize();
const presentation = shallowRef(props.control.value);
let revision = 0;

watch(
  () => props.control.value,
  (value) => {
    presentation.value = value;
  }
);
useControlElementRef(
  () => input.value?.inputRef ?? null,
  () => [
    props.control.focusRef,
    controlRef<HTMLInputElement>(props.control.attrs.ref),
  ]
);
onScopeDispose(() => {
  revision++;
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
    v-bind="
      toVueAttrs({
        ...withoutAttrs(control.attrs, ['ref']),
        'aria-label': control.label,
      })
    "
    :model-value="presentation"
    :type="control.type ?? 'text'"
    :size="size"
    :ui="{ base: className }"
    @update:model-value="update"
  />
</template>
