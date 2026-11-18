<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import VuetifyBasicFilterField from "./VuetifyBasicFilterField.vue";
import VuetifyChecklistField from "./VuetifyChecklistField.vue";

defineOptions({ name: "VuetifyFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const Render = () =>
  filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
  "checklist"
    ? h(VuetifyChecklistField<TRow>, { ...props })
    : h(VuetifyBasicFilterField<TRow>, { ...props, parts: FILTER_FIELD_PARTS });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
