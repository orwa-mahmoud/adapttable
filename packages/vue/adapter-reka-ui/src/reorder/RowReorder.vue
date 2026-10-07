<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
} from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaReorderControls } from "./controls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useRekaClasses();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: names.value,
    slots: rekaReorderControls,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
