<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { filterControls } from "./filterControls";

defineOptions({ name: "VuetifyBasicFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & {
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const names = useClassNames();
const model = useFilterFieldWith(() => props, props.parts);
const controls = filterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
