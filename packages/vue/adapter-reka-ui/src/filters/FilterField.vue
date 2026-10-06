<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { useRekaClasses } from "../context";
import BasicFilterField from "./BasicFilterField.vue";
import ChecklistFilter from "./ChecklistFilter.vue";

const props = defineProps<FilterFieldOptions<TRow>>();
const names = useRekaClasses();
const Render = () =>
  filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
  "checklist"
    ? h(
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
      )
    : h(BasicFilterField<TRow>, { ...props });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
