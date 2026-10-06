<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs, useElementRef } from "@adapttable/vue/adapter";
import UProseTbody from "@nuxt/ui/components/prose/Tbody.vue";
import UProseTd from "@nuxt/ui/components/prose/Td.vue";
import UProseTh from "@nuxt/ui/components/prose/Th.vue";
import UProseThead from "@nuxt/ui/components/prose/Thead.vue";
import UProseTr from "@nuxt/ui/components/prose/Tr.vue";
import { computed, useTemplateRef } from "vue";

import { useNuxtDensity } from "../densityContext";
import { withoutAttrs } from "./attrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  part: "thead" | "tbody" | "tr" | "th" | "td";
  attrs: Attrs;
}>();
const target = useTemplateRef<{ $el: unknown }>("target");
const density = useNuxtDensity();
const cellUi = computed(() =>
  density.value === "compact" ? { base: "px-2 py-1.5 text-xs" } : undefined
);
const attrs = computed(() => toVueAttrs(withoutAttrs(props.attrs, ["ref"])));
function owner(): ElementRef<HTMLElement> | undefined {
  const ref = props.attrs.ref;
  return typeof ref === "function"
    ? (ref as ElementRef<HTMLElement>)
    : undefined;
}
useElementRef(
  () =>
    typeof HTMLElement !== "undefined" &&
    target.value?.$el instanceof HTMLElement &&
    target.value.$el.tagName.toLowerCase() === props.part
      ? target.value.$el
      : null,
  owner
);
</script>

<template>
  <UProseThead v-if="part === 'thead'" ref="target" v-bind="attrs"
    ><slot
  /></UProseThead>
  <UProseTbody v-else-if="part === 'tbody'" ref="target" v-bind="attrs"
    ><slot
  /></UProseTbody>
  <UProseTr v-else-if="part === 'tr'" ref="target" v-bind="attrs"
    ><slot
  /></UProseTr>
  <UProseTh v-else-if="part === 'th'" ref="target" v-bind="attrs" :ui="cellUi"
    ><slot
  /></UProseTh>
  <UProseTd v-else ref="target" v-bind="attrs" :ui="cellUi"><slot /></UProseTd>
</template>
