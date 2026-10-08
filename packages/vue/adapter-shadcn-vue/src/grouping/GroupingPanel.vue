<script setup lang="ts" generic="TRow">
import type { GroupingPanelProps } from "@adapttable/vue";
import {
  GroupingPanelChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { shadcnGroupingControls } from "./controls";

const props = defineProps<GroupingPanelProps<TRow>>();
const names = useDataTableClassNames();
const slots = shadcnGroupingControls(names);
const Render = () =>
  GroupingPanelChrome({ ...props, classNames: names.value, slots });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
