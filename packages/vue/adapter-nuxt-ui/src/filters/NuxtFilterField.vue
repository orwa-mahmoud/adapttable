<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import NuxtBasicFilterField from "./NuxtBasicFilterField.vue";
import NuxtChecklistFilter from "./NuxtChecklistFilter.vue";
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
    <NuxtChecklistFilter
      :def="def"
      :source="source"
      :labels="labels"
      :class-names="names"
    />
  </fieldset>
  <NuxtBasicFilterField v-else v-bind="props" />
</template>
