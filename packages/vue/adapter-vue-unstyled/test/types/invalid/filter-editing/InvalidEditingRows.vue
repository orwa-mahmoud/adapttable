<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { editing } from "@adapttable/vue-unstyled/editing";
interface Person {
  id: string;
  name: string;
}
const rows: readonly Person[] = [{ id: "1", name: "Ada" }];
const columns = [{ key: "name" }];
const wrong = [editing<number>((row) => row.toFixed())];
const rowKey = (row: Person) => row.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="wrong"
  />
</template>
