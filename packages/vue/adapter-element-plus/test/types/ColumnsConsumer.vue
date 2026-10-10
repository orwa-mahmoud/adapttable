<script setup lang="ts">
import { type ColumnInput, DataTable } from "../../src";
import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "../../src/columns";
interface Row {
  id: string;
  name: string;
  age: number;
}
const data: Row[] = [{ id: "a", name: "Ada", age: 36 }];
const columns: ColumnInput<Row>[] = [
  {
    header: "Person",
    collapsedKey: "name",
    children: [
      { key: "name", sortable: true },
      { key: "age", sortable: true },
    ],
  },
];
const features = [
  collapsibleColumnGroups(),
  fitColumns(),
  multiSort(),
  resizableColumns(),
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
