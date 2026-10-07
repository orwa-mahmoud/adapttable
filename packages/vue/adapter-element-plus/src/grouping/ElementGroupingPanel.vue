<script setup lang="ts" generic="TRow">
import { type GroupingPanelProps } from "@adapttable/vue";
import { GroupingPanelChrome } from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { elementGroupingControls } from "./elementGroupingControls";

defineOptions({ name: "ElementGroupingPanel" });
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useClassNames();
const controls = elementGroupingControls(names);
const Render = () =>
  GroupingPanelChrome({
    ...props,
    classNames: names.value,
    slots: controls,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
