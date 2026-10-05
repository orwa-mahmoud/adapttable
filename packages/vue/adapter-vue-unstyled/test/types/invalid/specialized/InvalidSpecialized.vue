<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
interface Row {
  id: string;
  amount: number;
}
const rows: Row[] = [{ id: "a", amount: 1 }];
const columns: ColumnDef<Row>[] = [{ key: "amount" }];
const wrongFeature = rowReorder<{ id: number }>(() => undefined);
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="[wrongFeature]"
  />
</template>
