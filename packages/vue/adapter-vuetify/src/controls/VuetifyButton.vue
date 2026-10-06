<script setup lang="ts">
import { computed, shallowRef, type VNodeChild } from "vue";
import { VBtn } from "vuetify/components/VBtn";

import { controlAttrs, useControlRef } from "./controlRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly content: VNodeChild;
}>();
const button = shallowRef<InstanceType<typeof VBtn> | null>(null);
const attrs = computed(() => controlAttrs(props.attrs));
useControlRef(
  () => {
    const element: unknown = button.value?.$el;
    if (!element) return undefined;
    return element instanceof HTMLElement ? element : undefined;
  },
  () => props.attrs
);
const Content = () => props.content;
</script>

<template>
  <VBtn ref="button" type="button" variant="text" size="small" v-bind="attrs">
    <Content />
  </VBtn>
</template>
