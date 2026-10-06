<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs, useElementRef } from "@adapttable/vue/adapter";
import UCard from "@nuxt/ui/components/Card.vue";
import { computed, useTemplateRef } from "vue";

import { useNuxtDensity } from "../densityContext";
import { withoutAttrs } from "./attrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ attrs: Attrs }>();
const card = useTemplateRef<{ $el: unknown }>("card");
const density = useNuxtDensity();
const cardUi = computed(() =>
  density.value === "compact" ? { body: "p-3 sm:p-3" } : undefined
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
    card.value?.$el instanceof HTMLElement &&
    card.value.$el.tagName === "ARTICLE"
      ? card.value.$el
      : null,
  owner
);
</script>

<template>
  <UCard ref="card" as="article" variant="outline" v-bind="attrs" :ui="cardUi"
    ><slot
  /></UCard>
</template>
