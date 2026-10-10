<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { shadcnReorderControls } from "./controls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: names.value,
    slots: shadcnReorderControls,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
