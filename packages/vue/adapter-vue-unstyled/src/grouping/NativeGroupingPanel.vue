<script setup lang="ts" generic="TRow">
import {
  GroupingPanelChrome,
  type GroupingPanelProps,
} from "@adapttable/vue/features";

import { useClassNames } from "../classNamesContext";
import { nativeGroupingControls } from "./nativeGroupingControls";

defineOptions({ name: "NativeGroupingPanel" });
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useClassNames();
const controls = nativeGroupingControls(names);
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
