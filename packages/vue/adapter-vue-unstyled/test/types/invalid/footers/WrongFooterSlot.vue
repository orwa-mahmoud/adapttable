<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
interface Row {
  id: string;
  amount: number;
}
const rows: readonly Row[] = [];
const columns: readonly ColumnDef<Row>[] = [{ key: "amount" }];
</script>
<template>
  <DataTable :data="rows" :columns="columns" :row-key="(row) => row.id">
    <template #footer="{ row }">{{ row.id }}</template>
  </DataTable>
</template>
