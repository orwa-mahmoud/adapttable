<script setup lang="ts" generic="TRow">
import {
  FilterHeaderChrome,
  type FilterHeaderRowProps,
  type FilterHeaderRowSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NaiveFilterHeaderControl from "./NaiveFilterHeaderControl.vue";

defineOptions({ name: "NaiveFilterHeaderRow" });
const props = withDefaults(defineProps<FilterHeaderRowProps<TRow>>(), {
  enabled: undefined,
  expandable: undefined,
  showReorder: undefined,
  selection: undefined,
  showActions: undefined,
  stickyAttr: undefined,
});
const controls: FilterHeaderRowSlots<TRow> = {
  Control: (control) => h(NaiveFilterHeaderControl<TRow>, { ...control }),
};
const Render = () => FilterHeaderChrome({ ...props, controls });
Render.props = [] as string[];
</script>

<template><Render /></template>
