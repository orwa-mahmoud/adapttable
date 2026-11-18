<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  type FilterFieldOptions,
  filterLabel,
} from "@adapttable/vue/adapter";
import { ElFormItem } from "element-plus";

import { ElementChecklistFilter } from "./ElementChecklistFilter";

defineOptions({ name: "ElementChecklistField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
</script>

<template>
  <ElFormItem
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
</template>
