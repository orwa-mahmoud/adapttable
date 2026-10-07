<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/naive-ui/editing";
import { grouping } from "@adapttable/naive-ui/grouping";
import { h } from "vue";
interface Person {
  id: string;
  name: string;
  score: number;
  active: boolean;
}
const rows: Person[] = [{ id: "a", name: "Ada", score: 1, active: true }];
const columns: ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "score", editable: true, editor: "number" },
  { key: "active", editable: true, editor: "boolean" },
];
const observed: unknown[] = [];
const features = [
  editing<Person>((row, key, value) => {
    observed.push(row.name.toUpperCase(), key.toUpperCase(), value);
  }),
  editHistory(),
  dirtyIndicators(),
  undoRedoButtons(),
  grouping<Person>("active"),
];
const rowFeature = rowEditing<Person>((row, patch) => {
  observed.push(row.score.toFixed(), patch);
});
const batchFeature = batchEditing<Person>((edits) => {
  observed.push(edits[0]?.row.score.toFixed());
});
const Render = () =>
  h(DataTable<Person>, {
    data: rows,
    columns,
    rowKey: (row) => row.id,
    features: [rowFeature, batchFeature],
  });
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
  <Render />
  <output>{{ observed.length }}</output>
</template>
