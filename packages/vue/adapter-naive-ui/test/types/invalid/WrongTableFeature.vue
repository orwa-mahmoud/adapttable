<script setup lang="ts">
import { DataTable } from "@adapttable/naive-ui";
import { filters } from "@adapttable/naive-ui/filters";

interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
const rows: readonly Person[] = [{ id: "ada", name: "Ada" }];
const invoiceFilters = filters<Invoice>([
  { key: "amount", type: "numberRange" },
]);
</script>

<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="[invoiceFilters]"
  />
</template>
