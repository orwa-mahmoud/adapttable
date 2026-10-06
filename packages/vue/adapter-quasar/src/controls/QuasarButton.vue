<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { QBtn } from "quasar";
import { computed, useTemplateRef } from "vue";

import { quasarAttrs, useQuasarControlRef } from "./controlAttrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  attrs: Attrs;
  label?: string;
  focusRef?: ElementRef<HTMLButtonElement>;
}>();
const button = useTemplateRef<InstanceType<typeof QBtn>>("button");
const attrs = computed(() => quasarAttrs(props.attrs));
useQuasarControlRef(
  () => {
    if (!button.value) return null;
    const element: unknown = button.value.$el;
    return element instanceof HTMLButtonElement ? element : null;
  },
  () => props.attrs,
  () => props.focusRef
);
</script>

<template>
  <QBtn ref="button" type="button" v-bind="attrs" :label="label" flat no-caps>
    <slot />
  </QBtn>
</template>
