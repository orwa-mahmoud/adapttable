<script setup lang="ts">
import {
  type ColumnMenuSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { computed } from "vue";

import QuasarSelect from "../controls/QuasarSelect.vue";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: Parameters<ColumnMenuSlots["Choice"]>[0];
}>();
const active = useScopeActivity();
function keyboardHandler(
  value: unknown
): value is (event: KeyboardEvent) => void {
  return typeof value === "function";
}
const label = computed(() => {
  const value = props.control.attrs["aria-label"];
  return typeof value === "string" ? value : "";
});
const attrs = computed(() => ({
  ...props.control.attrs,
  onKeydown: (event: KeyboardEvent) => {
    if (!active.value || event.defaultPrevented || event.isComposing) return;
    // Public ARIA reflects opening immediately, before popup-show's transition
    // completes, and follows QSelect's responsive native input replacement.
    if (
      event.key === "Escape" &&
      event.target instanceof Element &&
      event.target.getAttribute("aria-expanded") === "true"
    ) {
      event.stopPropagation();
      return;
    }
    const handler = props.control.attrs.onKeydown;
    if (keyboardHandler(handler)) handler(event);
  },
}));
</script>

<template>
  <QuasarSelect
    v-if="active"
    :control="{
      ...control,
      attrs,
      label,
      onChange: (value) => {
        if (active) control.onChange(value);
      },
    }"
  />
</template>
