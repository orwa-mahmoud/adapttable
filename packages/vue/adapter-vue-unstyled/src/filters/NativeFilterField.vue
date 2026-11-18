<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NativeBasicFilterField from "./NativeBasicFilterField.vue";
import NativeChecklistField from "./NativeChecklistField.vue";
defineOptions({ name: "NativeFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const Render = () =>
  filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
  "checklist"
    ? h(NativeChecklistField<TRow>, { ...props })
    : h(NativeBasicFilterField<TRow>, { ...props, parts: FILTER_FIELD_PARTS });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
