<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";

import ElementBasicFilterField from "./ElementBasicFilterField.vue";
import ElementChecklistField from "./ElementChecklistField.vue";

defineOptions({ name: "ElementFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
</script>

<template>
  <ElementChecklistField
    v-if="
      filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
      'checklist'
    "
    v-bind="props"
  />
  <ElementBasicFilterField v-else v-bind="props" :parts="FILTER_FIELD_PARTS" />
</template>
