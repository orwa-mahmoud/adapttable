<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { naiveReorderControls } from "./naiveReorderControls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: { ...names.value },
    slots: naiveReorderControls,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
