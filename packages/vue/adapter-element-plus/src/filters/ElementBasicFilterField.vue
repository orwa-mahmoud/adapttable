<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { elementFilterControls } from "./fieldControls";

defineOptions({ name: "ElementBasicFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & {
    classNames?: DataTableClassNames;
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const model = useFilterFieldWith(() => props, props.parts);
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
