<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";

import NuxtBasicFilterField from "./NuxtBasicFilterField.vue";
import NuxtChecklistField from "./NuxtChecklistField.vue";
const props = defineProps<FilterFieldOptions<TRow>>();
</script>
<template>
  <NuxtChecklistField
    v-if="
      filterWidgetKind(def, registry ?? defaultFilterRegistry) === 'checklist'
    "
    v-bind="props"
  />
  <NuxtBasicFilterField v-else v-bind="props" :parts="FILTER_FIELD_PARTS" />
</template>
