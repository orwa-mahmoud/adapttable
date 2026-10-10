<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
import { rowReorder } from "@adapttable/quasar/row-reorder";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
const rows: Person[] = [];
const features = [rowReorder<Invoice>(() => undefined)];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
