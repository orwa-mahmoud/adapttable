<script setup lang="ts" generic="TRow">
import { type GroupingPanelProps } from "@adapttable/vue";
import {
  GroupingPanelChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { naiveGroupingControls } from "./naiveGroupingControls";

defineOptions({ name: "NaiveGroupingPanel" });
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useDataTableClassNames();
const controls = naiveGroupingControls(names);
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
