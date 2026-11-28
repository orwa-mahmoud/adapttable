<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { useHeadlessClasses } from "../context";
import { headlessFilterControls } from "../controls/filterControls";

const props = defineProps<
  FilterFieldOptions<TRow> & {
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const names = useHeadlessClasses();
const model = useFilterFieldWith(() => props, props.parts);
const controls = headlessFilterControls(() => names.value);
const Render = () =>
  FilterFieldChrome({ model: model.value, controls, classNames: names.value });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
