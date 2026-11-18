<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";

import QuasarBasicFilterField from "./QuasarBasicFilterField.vue";
import QuasarChecklistField from "./QuasarChecklistField.vue";
const props = defineProps<FilterFieldOptions<TRow>>();
</script>
<template>
  <QuasarChecklistField
    v-if="
      filterWidgetKind(def, registry ?? defaultFilterRegistry) === 'checklist'
    "
    v-bind="props"
  />
  <QuasarBasicFilterField v-else v-bind="props" :parts="FILTER_FIELD_PARTS" />
</template>
