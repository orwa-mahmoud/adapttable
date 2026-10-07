<script setup lang="ts">
import { type ColumnInput, DataTable } from "../../src";
import { findInTable } from "../../src/find-in-table";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [{ id: "a", name: "Ada" }];
const columns: ColumnInput<Row>[] = [{ key: "name" }];
const features = [findInTable({ button: true })];
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
