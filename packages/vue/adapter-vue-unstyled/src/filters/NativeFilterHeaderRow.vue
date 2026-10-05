<script setup lang="ts" generic="TRow">
import {
  FilterHeaderRowChrome,
  type FilterHeaderRowProps,
  type FilterHeaderRowSlots,
} from "@adapttable/vue/header-filters";
import { h } from "vue";

import NativeFilterHeaderControl from "./NativeFilterHeaderControl.vue";

defineOptions({ name: "NativeFilterHeaderRow" });
const props = withDefaults(defineProps<FilterHeaderRowProps<TRow>>(), {
  enabled: undefined,
  expandable: undefined,
  showReorder: undefined,
  selection: undefined,
  showActions: undefined,
  stickyAttr: undefined,
});
const controls: FilterHeaderRowSlots<TRow> = {
  Control: (control) => h(NativeFilterHeaderControl<TRow>, { ...control }),
};
const Render = () => FilterHeaderRowChrome({ ...props, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
