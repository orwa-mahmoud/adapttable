<script setup lang="ts" generic="TRow">
import type { GroupingPanelProps } from "@adapttable/vue";
import { GroupingPanelChrome } from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaGroupingControls } from "./controls";

const props = defineProps<GroupingPanelProps<TRow>>();
const names = useRekaClasses();
const slots = rekaGroupingControls(names);
const Render = () =>
  GroupingPanelChrome({ ...props, classNames: names.value, slots });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
