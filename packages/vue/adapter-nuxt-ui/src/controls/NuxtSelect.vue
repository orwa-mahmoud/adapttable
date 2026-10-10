<script setup lang="ts">
import { toVueAttrs, useScopeActivity } from "@adapttable/vue/adapter";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed, onMounted, shallowRef } from "vue";

import { useNuxtControlSize } from "../densityContext";
import { controlRef, withoutAttrs } from "./attrs";
import type { NuxtSelectControl } from "./types";
import { useControlElementRef } from "./useControlElementRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: NuxtSelectControl;
  className?: string;
  portal?: boolean | HTMLElement;
}>();
const select = shallowRef<{ triggerRef: HTMLButtonElement | null } | null>(
  null
);
const size = useNuxtControlSize();
const active = useScopeActivity();
const mounted = shallowRef(false);
onMounted(() => {
  mounted.value = true;
});
// Cached tables retire the vendor popup and resume with a fresh closed Select.
const present = computed(() => !mounted.value || active.value);
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
useControlElementRef(
  () => select.value?.triggerRef ?? null,
  () => [
    props.control.focusRef,
    controlRef<HTMLButtonElement>(props.control.attrs.ref),
  ]
);
function update(index: unknown): void {
  if (typeof index !== "number") return;
  const option = props.control.options[index];
  if (option) props.control.onChange(option.value);
}
</script>

<template>
  <USelect
    v-if="present"
    ref="select"
    v-bind="
      toVueAttrs({
        ...withoutAttrs(control.attrs, ['ref']),
        'aria-label': control.label,
      })
    "
    :items="items"
    :model-value="selected"
    :class="className"
    :portal="portal ?? false"
    :size="size"
    @update:model-value="update"
  />
</template>
