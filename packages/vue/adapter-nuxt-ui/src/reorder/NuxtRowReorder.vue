<script setup lang="ts" generic="TRow">
import {
  RowReorderChrome,
  type RowReorderControlProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { nuxtReorderControls } from "./nuxtReorderControls";

const props = defineProps<RowReorderControlProps<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  RowReorderChrome({
    ...props,
    classNames: names.value,
    slots: nuxtReorderControls,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>

<style>
@layer components {
  .adapttable-nuxt-row-menu {
    min-width: 10rem;
    max-height: 70dvh;
    max-width: min(28rem, calc(100vw - 2rem));
    overflow-y: auto;
  }
  .adapttable-nuxt-row-menu-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.375rem;
  }
}
</style>
