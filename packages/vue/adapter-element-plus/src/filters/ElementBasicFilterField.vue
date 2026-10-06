<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  FilterFieldChrome,
  type FilterFieldOptions,
  useFilterField,
} from "@adapttable/vue/adapter";

import { elementFilterControls } from "./fieldControls";

defineOptions({ name: "ElementBasicFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
const model = useFilterField(() => props);
const controls = elementFilterControls(() => props.classNames ?? {});
const Render = () =>
  FilterFieldChrome({
    model: model.value,
    controls,
    classNames: props.classNames,
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
