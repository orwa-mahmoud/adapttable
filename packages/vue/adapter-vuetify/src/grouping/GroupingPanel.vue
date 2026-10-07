<script setup lang="ts" generic="TRow">
import type { GroupingPanelProps } from "@adapttable/vue";
import { GroupingPanelChrome } from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { vuetifyGroupingSlots } from "./controls";
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useClassNames();
const slots = vuetifyGroupingSlots(names);
const Render = () =>
  GroupingPanelChrome({ ...props, classNames: names.value, slots });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
