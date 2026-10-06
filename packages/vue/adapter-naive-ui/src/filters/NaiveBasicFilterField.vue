<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  useDataTableClassNames,
  useFilterField,
} from "@adapttable/vue/adapter";

import { naiveFilterControls } from "./controls";

defineOptions({ name: "NaiveBasicFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
const model = useFilterField(() => props);
const controls = naiveFilterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
Render.props = [] as string[];
</script>

<template><Render /></template>
