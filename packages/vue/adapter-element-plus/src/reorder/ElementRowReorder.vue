<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { elementReorderControls } from "./elementReorderControls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useClassNames();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: { ...names.value },
    slots: elementReorderControls,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
