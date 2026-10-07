<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  useFilterField,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { filterControls } from "./filterControls";

defineOptions({ name: "VuetifyBasicFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useClassNames();
const model = useFilterField(() => props);
const controls = filterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
