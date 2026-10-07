<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";

interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "ada", name: "Ada" }];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row: number) => String(row)"
  />
</template>
