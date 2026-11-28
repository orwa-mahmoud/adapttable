<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  defaultFilterRegistry,
  FILTER_FIELD_PARTS,
  type FilterFieldOptions,
  filterWidgetKind,
} from "@adapttable/vue/adapter";

import AntdBasicFilterField from "./AntdBasicFilterField.vue";
import AntdChecklistField from "./AntdChecklistField.vue";

defineOptions({ name: "AntdFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
</script>

<template>
  <AntdChecklistField
    v-if="
      filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
      'checklist'
    "
    v-bind="props"
  />
  <AntdBasicFilterField v-else v-bind="props" :parts="FILTER_FIELD_PARTS" />
</template>
