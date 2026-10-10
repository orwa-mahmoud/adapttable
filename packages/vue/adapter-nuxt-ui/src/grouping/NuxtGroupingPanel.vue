<script setup lang="ts" generic="TRow">
import "./nuxtGrouping.css";

import type { GroupingPanelProps } from "@adapttable/vue";
import {
  GroupingPanelChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { nuxtGroupingControls } from "./nuxtGroupingControls";

defineOptions({ name: "NuxtGroupingPanel" });
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useDataTableClassNames();
const controls = nuxtGroupingControls(() => names.value);
const Render = () =>
  GroupingPanelChrome({ ...props, classNames: names.value, slots: controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
