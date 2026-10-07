<script setup lang="ts">
import type { Attrs } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import { quasarAttrs, useQuasarControlRef } from "../controls/controlAttrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ tag: "table" | "div" | "dd"; attrs: Attrs }>();
const target = shallowRef<HTMLElement | null>(null);
const attrs = computed(() => quasarAttrs(props.attrs));
useQuasarControlRef(
  () => target.value,
  () => props.attrs
);
</script>

<template>
  <component :is="tag" ref="target" v-bind="attrs"><slot /></component>
</template>
