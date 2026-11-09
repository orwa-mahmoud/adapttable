<script setup lang="ts" generic="TRow">
import {
  FilterHeaderChrome,
  type FilterHeaderRowProps,
  type FilterHeaderRowSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import FilterHeaderControl from "./FilterHeaderControl.vue";

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
  Control: (control) => h(FilterHeaderControl<TRow>, { ...control }),
};
const Render = () =>
  FilterHeaderChrome({
    ...props,
    enabled,
    expandable,
    showReorder,
    selection,
    showActions,
    stickyAttr,
    controls,
  });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
