<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import QuasarBasicFilterField from "./QuasarBasicFilterField.vue";
import QuasarChecklistFilter from "./QuasarChecklistFilter.vue";
const props = defineProps<FilterFieldOptions<TRow>>();
const names = useDataTableClassNames();
</script>
<template>
  <fieldset
    v-if="
      filterWidgetKind(def, registry ?? defaultFilterRegistry) === 'checklist'
    "
    :class="names.filterField"
    data-adapttable-part="filter-field"
  >
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
  <QuasarBasicFilterField v-else v-bind="props" />
</template>
