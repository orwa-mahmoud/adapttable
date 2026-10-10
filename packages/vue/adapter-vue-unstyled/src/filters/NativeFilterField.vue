<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { useClassNames } from "../classNamesContext";
import NativeBasicFilterField from "./NativeBasicFilterField.vue";
import { NativeChecklistFilter } from "./NativeChecklistFilter";
defineOptions({ name: "NativeFilterField" });
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useClassNames();
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
          h(NativeChecklistFilter<TRow>, {
            def: props.def,
            source: props.source,
            labels: props.labels,
            classNames: names.value,
          }),
        ]
      )
    : h(NativeBasicFilterField<TRow>, { ...props });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
