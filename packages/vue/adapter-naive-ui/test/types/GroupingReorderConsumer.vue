<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import { groupingPanel } from "@adapttable/naive-ui/grouping-panel";
import { rowReorder } from "@adapttable/naive-ui/row-reorder";
import { aggregate } from "@adapttable/vue";
interface Person {
  id: string;
  team: string;
  amount: number;
}
const rows: Person[] = [{ id: "a", team: "Core", amount: 2 }];
const columns: ColumnDef<Person>[] = [
  { key: "team" },
  { key: "amount", aggregatable: { operations: ["sum", "avg", "count"] } },
];
const observed: unknown[] = [];
const features = [
  groupingPanel<Person>("team", {
    groupAggregates: aggregate<Person>({ amount: "sum" }),
  }),
  rowReorder<Person>(
    (from, to, row) => {
      observed.push(from.toFixed(), to.toFixed(), row.amount.toFixed());
    },
    {
      movePolicy: "confirm",
      onGroupMove: (row, from, to, position) => {
        observed.push(row.team, from, to, position.toFixed());
      },
    }
  ),
];
</script>
<template>
  <output>{{ observed.length }}</output>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
  />
</template>
