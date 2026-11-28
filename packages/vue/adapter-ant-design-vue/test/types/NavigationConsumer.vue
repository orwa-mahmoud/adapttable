<script setup lang="ts">
import { type CellEdit, type ColumnInput, DataTable } from "../../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../../src/cell-navigation";
import { selectionStats, statusBar } from "../../src/status-bar";
interface Row {
  id: string;
  score: number;
}
const data: Row[] = [{ id: "a", score: 10 }];
const columns: ColumnInput<Row>[] = [
  { key: "score", editable: true, editor: "number" },
];
function fill(edits: CellEdit<Row>[]) {
  return edits.map((edit) => edit.row.id).join(",");
}
const features = [
  cellNavigation({
    onRangeChange: (range) => range?.anchor.row,
    onFill: fill,
  }),
  columnSelectionCheckbox(),
  statusBar(),
  selectionStats(),
];
</script>
<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
