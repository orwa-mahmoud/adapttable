<script setup lang="ts">
import { DataTable } from "@adapttable/vue-headless-ui";
import { filters } from "@adapttable/vue-headless-ui/filters";

interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
const rows: Person[] = [{ id: "ada", name: "Ada" }];
const features = [filters<Invoice>()];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
