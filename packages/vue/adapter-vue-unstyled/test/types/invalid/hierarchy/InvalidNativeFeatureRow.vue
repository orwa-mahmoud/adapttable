<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { tree } from "@adapttable/vue-unstyled/tree";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
const rows: readonly Person[] = [];
const rowKey = (row: Person) => row.id;
const features = [tree<Invoice>({})];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="rowKey"
    :features="features"
  />
</template>
