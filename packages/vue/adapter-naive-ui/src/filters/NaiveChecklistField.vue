<script setup lang="ts" generic="TRow">
import {
  type FilterFieldOptions,
  filterLabel,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NaiveChecklistFilter from "./NaiveChecklistFilter.vue";

defineOptions({ name: "NaiveChecklistField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  h(
    "fieldset",
    {
      "data-adapttable-part": "filter-field",
      class: names.value.filterField,
    },
    [
      h(
        "legend",
        {
          "data-adapttable-part": "filter-label",
          class: names.value.filterLabel,
        },
        filterLabel(props.def)
      ),
      h(NaiveChecklistFilter<TRow>, {
        def: props.def,
        source: props.source,
        labels: props.labels,
        classNames: names.value,
      }),
    ]
  );
Render.props = [] as string[];
</script>

<template><Render /></template>
