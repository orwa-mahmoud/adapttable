<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useDataTableClassNames,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { createQuasarFilterSlots } from "./quasarFilterSlots";
const props = defineProps<
  FilterFieldOptions<TRow> & {
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const names = useDataTableClassNames();
const controls = createQuasarFilterSlots(() => names.value);
const model = useFilterFieldWith(() => props, props.parts);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
