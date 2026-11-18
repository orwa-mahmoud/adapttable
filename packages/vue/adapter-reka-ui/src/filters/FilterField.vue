<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import BasicFilterField from "./BasicFilterField.vue";
import ChecklistFilterField from "./ChecklistFilterField.vue";

const props = defineProps<FilterFieldOptions<TRow>>();
const Render = () =>
  filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
  "checklist"
    ? h(ChecklistFilterField<TRow>, { ...props })
    : h(BasicFilterField<TRow>, { ...props, parts: FILTER_FIELD_PARTS });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
