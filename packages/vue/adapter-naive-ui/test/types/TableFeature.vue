<script setup lang="ts">
import { DataTable } from "@adapttable/naive-ui";
import { filters } from "@adapttable/naive-ui/filters";

interface Person {
  id: string;
  name: string;
}
const rows: readonly Person[] = [{ id: "ada", name: "Ada" }];
const personFilters = filters<Person>([{ key: "name", type: "text" }]);
</script>

<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="[personFilters]"
  />
</template>
