<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { filters } from "@adapttable/vue-unstyled/filters";
import { rowActions } from "@adapttable/vue-unstyled/row-actions";
import { h } from "vue";
interface Row {
  id: string;
  amount: number;
}
const columns: readonly ColumnDef<Row>[] = [
  {
    key: "amount",
    sortable: true,
    headerActions: ({ column, sortIndex }) =>
      h("span", `${column.key} ${sortIndex ?? ""}`),
  },
];
const features = [
  filters<Row>([{ key: "amount", type: "numberRange" }]),
  rowActions<Row>([
    {
      key: "read",
      label: "Read",
      onClick: (row) => row.amount.toFixed(2),
    },
  ]),
];
</script>
<template>
  <DataTable
    :data="[{ id: 'one', amount: 20 }]"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
    :skeleton-rows="4"
    row-actions-layout="menu"
    :class-names="{
      chips: 'chips',
      actionButton: 'action',
      rowActionsMenu: 'menu',
      sortIndex: 'rank',
      loadingLine: 'line',
      expandCell: 'expand',
    }"
  >
    <template #headerActions="{ column, toggleSort }"
      ><button type="button" @click="toggleSort()">
        Sort {{ column.key }}
      </button></template
    >
  </DataTable>
</template>
