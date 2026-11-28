<script setup lang="ts" generic="TRow">
import {
  type DataTableClassNames,
  type FilterFieldOptions,
  filterLabel,
} from "@adapttable/vue/adapter";
import { FormItem } from "ant-design-vue";

import { AntdChecklistFilter } from "./AntdChecklistFilter";

defineOptions({ name: "AntdChecklistField" });
const props = defineProps<
  FilterFieldOptions<TRow> & { classNames?: DataTableClassNames }
>();
</script>

<template>
  <FormItem
    :label="filterLabel(props.def)"
    :class="props.classNames?.filterField"
    data-adapttable-part="filter-field"
  >
    <AntdChecklistFilter
      :def="props.def"
      :source="props.source"
      :labels="props.labels"
      :class-names="props.classNames"
    />
  </FormItem>
</template>
