<script setup lang="ts" generic="TRow">
import {
  FilterHeaderChrome as FilterHeaderRowChrome,
  type FilterHeaderRowProps,
  type FilterHeaderRowSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import ElementFilterHeaderControl from "./ElementFilterHeaderControl.vue";

defineOptions({ name: "ElementFilterHeaderRow" });
const {
  enabled = undefined,
  expandable = undefined,
  showReorder = undefined,
  selection = undefined,
  showActions = undefined,
  stickyAttr = undefined,
  ...props
} = defineProps<FilterHeaderRowProps<TRow>>();
const controls: FilterHeaderRowSlots<TRow> = {
  Control: (control) => h(ElementFilterHeaderControl<TRow>, { ...control }),
};
const Render = () =>
  FilterHeaderRowChrome({
    ...props,
    enabled,
    expandable,
    showReorder,
    selection,
    showActions,
    stickyAttr,
    controls,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
