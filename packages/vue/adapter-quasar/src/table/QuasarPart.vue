<script setup lang="ts">
import type { Attrs } from "@adapttable/vue";
import { QCard, QCardSection, QSeparator, QTd, QTh, QTr } from "quasar";
import { type ComponentPublicInstance, computed, useTemplateRef } from "vue";

import { quasarAttrs, useQuasarControlRef } from "../controls/controlAttrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  kind: "row" | "header" | "cell" | "card" | "section" | "separator";
  attrs: Attrs;
}>();
const components = {
  row: QTr,
  header: QTh,
  cell: QTd,
  card: QCard,
  section: QCardSection,
  separator: QSeparator,
};
const native = useTemplateRef<ComponentPublicInstance>("native");
const attrs = computed(() => quasarAttrs(props.attrs));
useQuasarControlRef(
  () => {
    if (!native.value) return null;
    const element: unknown = native.value.$el;
    return element instanceof HTMLElement ? element : null;
  },
  () => props.attrs
);
</script>

<template>
  <component :is="components[kind]" ref="native" v-bind="attrs"
    ><slot
  /></component>
</template>
