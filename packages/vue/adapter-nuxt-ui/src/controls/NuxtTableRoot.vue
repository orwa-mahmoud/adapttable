<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs, useElementRef } from "@adapttable/vue/adapter";
import { computed, useTemplateRef } from "vue";

import { withoutAttrs } from "./attrs";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ attrs: Attrs }>();
const table = useTemplateRef<HTMLTableElement>("table");
const attrs = computed(() => toVueAttrs(withoutAttrs(props.attrs, ["ref"])));
function owner(): ElementRef<HTMLTableElement> | undefined {
  const ref = props.attrs.ref;
  return typeof ref === "function"
    ? (ref as ElementRef<HTMLTableElement>)
    : undefined;
}
useElementRef(() => table.value, owner);
</script>

<template>
  <table ref="table" v-bind="attrs">
    <slot />
  </table>
</template>
