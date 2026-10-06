<script setup lang="ts">
import type {
  BatchEditBarProps,
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
  HeaderFilterOptions,
  RowEditActionsProps,
  VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { NativeBatchEditBar } from "@adapttable/vue-unstyled/batch-editing";
import {
  NativeEditableCell,
  NativeRowEditActions,
} from "@adapttable/vue-unstyled/editing";
import {
  ChecklistFilter as NativeChecklistFilter,
  NativeFilterField,
  FilterTreeBuilder as NativeFilterTree,
} from "@adapttable/vue-unstyled/filters";
import { NativeHeaderFilter } from "@adapttable/vue-unstyled/header-filters";

interface Row {
  id: string;
  name: string;
}
defineProps<{
  cell: VueEditableCellProps<Row>;
  row: RowEditActionsProps<Row>;
  batch: BatchEditBarProps<Row>;
  field: FilterFieldOptions<Row>;
  checklist: ChecklistFilterProps<Row>;
  tree: FilterTreeBuilderProps<Row>;
  header: HeaderFilterOptions<Row>;
}>();
</script>

<template>
  <NativeEditableCell v-bind="cell" />
  <NativeRowEditActions v-bind="row" />
  <NativeBatchEditBar v-bind="batch" />
  <NativeFilterField v-bind="field" />
  <NativeChecklistFilter v-bind="checklist" />
  <NativeFilterTree v-bind="tree" />
  <NativeHeaderFilter v-bind="header" />
</template>
