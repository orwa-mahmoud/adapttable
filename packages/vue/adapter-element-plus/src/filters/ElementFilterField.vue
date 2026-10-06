<script setup lang="ts" generic="TRow">
import {
  defaultFilterRegistry,
  type DataTableClassNames,
  type FilterFieldOptions,
  filterLabel,
  filterWidgetKind,
} from "@adapttable/vue/adapter";
import { ElFormItem } from "element-plus";

import ElementBasicFilterField from "./ElementBasicFilterField.vue";
import { ElementChecklistFilter } from "./ElementChecklistFilter";

defineOptions({ name: "ElementFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
</script>

<template>
  <ElFormItem
    v-if="
      filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
      'checklist'
    "
    :label="filterLabel(props.def)"
    :class="props.classNames?.filterField"
    data-adapttable-part="filter-field"
  >
    <ElementChecklistFilter
      :def="props.def"
      :source="props.source"
      :labels="props.labels"
      :class-names="props.classNames"
    />
  </ElFormItem>
  <ElementBasicFilterField v-else v-bind="props" />
</template>
