<script setup lang="ts">
import { ref } from "vue";

import { type ColumnDef, DataTable } from "../../src";
import { batchEditing } from "../../src/batch-editing";
import {
  type CellEditHandler,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../../src/editing";
interface Row {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
}
const rows: Row[] = [{ id: "a", name: "Ada", active: true, tags: [] }];
const columns: ColumnDef<Row>[] = [
  { key: "name", editable: true },
  { key: "active", editable: true, editor: "boolean" },
  {
    key: "tags",
    editable: true,
    editor: { type: "multi-select", options: ["a", "b"] },
  },
];
const last = ref("");
const saveCell: CellEditHandler<Row> = (row, key, value) => {
  last.value = `${row.name}:${key}:${String(value)}`;
};
const cell = [
  editing(saveCell),
  dirtyIndicators(),
  editHistory(),
  undoRedoButtons(),
];
const row = [
  rowEditing<Row>((item, changes) => {
    last.value = item.name + Object.keys(changes).join(",");
  }),
];
const batch = [
  batchEditing<Row>((edits) => {
    for (const edit of edits) {
      last.value = edit.row.name + Object.keys(edit.patch).join(",");
    }
  }),
];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(item: Row) => item.id"
    :features="cell"
    :url-sync="false"
  />
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(item: Row) => item.id"
    :features="row"
    :url-sync="false"
  />
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(item: Row) => item.id"
    :features="batch"
    :url-sync="false"
  />
  <output>{{ last }}</output>
</template>
