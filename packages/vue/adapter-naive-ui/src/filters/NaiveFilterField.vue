<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NaiveBasicFilterField from "./NaiveBasicFilterField.vue";
import NaiveChecklistFilter from "./NaiveChecklistFilter.vue";

defineOptions({ name: "NaiveFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
const Render = () => {
  if (
    filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) !==
    "checklist"
  ) {
    return h(NaiveBasicFilterField<TRow>, { ...props });
  }
  return h(
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
};
Render.props = [] as string[];
</script>

<template><Render /></template>
