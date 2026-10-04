<script setup lang="ts" generic="TRow extends { id: string; name: string }">
import type { ColumnDef } from "@adapttable/vue";
import {
  EditableCellChrome,
  editing as editingFeature,
  type EditingBundle,
  useEditableCellModel,
} from "@adapttable/vue/editing";
import type { TableFeature } from "@adapttable/vue/features";
import {
  FilterFieldChrome,
  type FilterFormSource,
  filters,
  type TableLabels,
  useFilterField,
} from "@adapttable/vue/filters";
import { computed, h } from "vue";
const props = defineProps<{
  row: TRow;
  rows: readonly TRow[];
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  editing: EditingBundle<TRow>;
  onEdit: (row: TRow, key: string, value: unknown) => void;
}>();
const column: ColumnDef<TRow> = {
  key: "name",
  editable: true,
  editValue: (row) => row.name,
};
const features = computed<readonly TableFeature<TRow>[]>(() => [
  editingFeature<TRow>(props.onEdit),
  filters<TRow>([{ key: "name", type: "text", getValue: (row) => row.name }]),
]);
const filter = useFilterField(() => ({
  def: { key: "name", type: "text" },
  source: props.source,
  labels: props.labels,
}));
const editor = useEditableCellModel(() => ({
  row: props.row,
  rows: props.rows,
  rowKey: (row: TRow) => row.id,
  rowId: props.row.id,
  rowIndex: 0,
  column,
  columns: [column],
  editLabel: "Edit name",
  editing: props.editing,
  display: props.row.name,
}));
const filterControls = {
  Input: () => h("span"),
  Select: () => h("span"),
  Checkbox: () => h("span"),
};
const editorControls = {
  Activate: () => h("span"),
  Editor: () => h("span"),
  Button: () => h("span"),
};
defineExpose({ features });
</script>
<template>
  <FilterFieldChrome :model="filter" :controls="filterControls" />
  <EditableCellChrome :model="editor" :controls="editorControls" />
</template>
