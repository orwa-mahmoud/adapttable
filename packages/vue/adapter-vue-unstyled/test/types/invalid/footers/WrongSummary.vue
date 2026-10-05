<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
interface Row {
  id: string;
  amount: number;
}
const rows: readonly Row[] = [];
const columns: readonly ColumnDef<Row>[] = [{ key: "amount" }];
const summary = (current: readonly { missing: number }[]) => ({
  amount: current.length,
});
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :summary-row="summary"
  />
</template>
