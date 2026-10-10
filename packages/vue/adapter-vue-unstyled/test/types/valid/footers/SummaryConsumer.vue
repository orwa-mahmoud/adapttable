<script setup lang="ts">
import {
  type ColumnDef,
  DataTable,
  type SummaryRowFn,
} from "@adapttable/vue-unstyled";
import { h } from "vue";
interface Row {
  id: string;
  amount: number;
}
const rows: readonly Row[] = [{ id: "one", amount: 10 }];
const columns: readonly ColumnDef<Row>[] = [
  {
    key: "amount",
    footer: ({ value }) =>
      h("b", typeof value === "number" ? value.toFixed(2) : ""),
  },
];
const summaryRow: SummaryRowFn<Row> = (current) => ({
  amount: current.reduce((sum, row) => sum + row.amount, 0),
});
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :summary-row="summaryRow"
    :url-sync="false"
  >
    <template #footer="{ column, value }"
      >{{ column.key }}: {{ value }}</template
    >
    <template #tableFooter><p>Reviewed</p></template>
  </DataTable>
</template>
