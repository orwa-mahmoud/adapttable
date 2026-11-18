<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useDataTableClassNames,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { naiveFilterControls } from "./controls";

defineOptions({ name: "NaiveBasicFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & {
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const names = useDataTableClassNames();
const model = useFilterFieldWith(() => props, props.parts);
const controls = naiveFilterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
Render.props = [] as string[];
</script>

<template><Render /></template>
