<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NaiveBasicFilterField from "./NaiveBasicFilterField.vue";
import NaiveChecklistField from "./NaiveChecklistField.vue";

defineOptions({ name: "NaiveFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const Render = () =>
  filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
  "checklist"
    ? h(NaiveChecklistField<TRow>, { ...props })
    : h(NaiveBasicFilterField<TRow>, { ...props, parts: FILTER_FIELD_PARTS });
Render.props = [] as string[];
</script>

<template><Render /></template>
