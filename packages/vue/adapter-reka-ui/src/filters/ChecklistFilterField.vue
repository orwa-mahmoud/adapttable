<script setup lang="ts" generic="TRow">
import { type FilterFieldOptions, filterLabel } from "@adapttable/vue/adapter";
import { h } from "vue";

import { useRekaClasses } from "../context";
import ChecklistFilter from "./ChecklistFilter.vue";

const props = defineProps<FilterFieldOptions<TRow>>();
const names = useRekaClasses();
const Render = () =>
  h(
    "fieldset",
    {
      class: names.value.filterField,
      "data-adapttable-part": "filter-field",
    },
    [
      h(
        "legend",
        {
          class: names.value.filterLabel,
          "data-adapttable-part": "filter-label",
        },
        filterLabel(props.def)
      ),
      h(ChecklistFilter<TRow>, {
        def: props.def,
        source: props.source,
        labels: props.labels,
        classNames: names.value,
      }),
    ]
  );
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
