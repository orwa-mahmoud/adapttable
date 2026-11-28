<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
} from "@adapttable/vue/adapter";

import { useHeadlessClasses } from "../context";
import { headlessReorderControls } from "./controls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useHeadlessClasses();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: names.value,
    slots: headlessReorderControls,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
