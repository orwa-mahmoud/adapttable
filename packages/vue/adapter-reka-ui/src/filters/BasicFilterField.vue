<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  useFilterField,
} from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaFilterControls } from "../controls/filterControls";

const props = defineProps<FilterFieldOptions<TRow>>();
const names = useRekaClasses();
const model = useFilterField(() => props);
const controls = rekaFilterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
