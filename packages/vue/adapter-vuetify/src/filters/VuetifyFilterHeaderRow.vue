<script setup lang="ts" generic="TRow">
import {
  FilterHeaderChrome,
  type FilterHeaderRowProps,
  type FilterHeaderRowSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import VuetifyFilterHeaderControl from "./VuetifyFilterHeaderControl.vue";

defineOptions({ name: "VuetifyFilterHeaderRow" });
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
  Control: (control) => h(VuetifyFilterHeaderControl<TRow>, { ...control }),
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
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
