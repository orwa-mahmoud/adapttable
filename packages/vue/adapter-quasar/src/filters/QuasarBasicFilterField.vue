<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  useDataTableClassNames,
  useFilterField,
} from "@adapttable/vue/adapter";

import { createQuasarFilterSlots } from "./quasarFilterSlots";
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
const controls = createQuasarFilterSlots(() => names.value);
const model = useFilterField(() => props);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
