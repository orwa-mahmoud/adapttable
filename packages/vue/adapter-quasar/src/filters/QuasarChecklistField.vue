<script setup lang="ts" generic="TRow">
import {
  type FilterFieldOptions,
  filterLabel,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import QuasarChecklistFilter from "./QuasarChecklistFilter.vue";
defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
</script>
<template>
  <fieldset :class="names.filterField" data-adapttable-part="filter-field">
    <legend :class="names.filterLabel" data-adapttable-part="filter-label">
      {{ filterLabel(def) }}
    </legend>
    <QuasarChecklistFilter
      :def="def"
      :source="source"
      :labels="labels"
      :class-names="names"
    />
  </fieldset>
</template>
