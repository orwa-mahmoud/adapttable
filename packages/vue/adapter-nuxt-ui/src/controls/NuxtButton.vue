<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs, useElementRef } from "@adapttable/vue/adapter";
import UButton from "@nuxt/ui/components/Button.vue";
import { computed, mergeProps, shallowRef } from "vue";

import { useNuxtControlSize } from "../densityContext";
import { withoutAttrs } from "./attrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ attrs: Attrs }>();
const button = shallowRef<{ $el: unknown } | null>(null);
const size = useNuxtControlSize();
const attrs = computed(() => toVueAttrs(withoutAttrs(props.attrs, ["ref"])));
function owner(): ElementRef<HTMLButtonElement> | undefined {
  const ref = props.attrs.ref;
  return typeof ref === "function"
    ? (ref as ElementRef<HTMLButtonElement>)
    : undefined;
}
useElementRef(
  () =>
    typeof HTMLButtonElement !== "undefined" &&
    button.value?.$el instanceof HTMLButtonElement
      ? button.value.$el
      : null,
  owner
);
</script>

<template>
  <UButton
    ref="button"
    type="button"
    color="neutral"
    variant="outline"
    :size="size"
    v-bind="mergeProps(attrs, $attrs)"
  >
    <slot />
  </UButton>
</template>
