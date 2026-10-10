<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
interface Person {
  id: string;
  score: number;
}
const rows: Person[] = [{ id: "ada", score: 10 }];
const columns: ColumnDef<Person, number>[] = [
  {
    key: "score",
    accessor: (row) => row.score,
    cell: ({ value }) => value.toUpperCase(),
  },
];
</script>
<template>
  <DataTable :data="rows" :columns="columns" :row-key="(row) => row.id" />
</template>
