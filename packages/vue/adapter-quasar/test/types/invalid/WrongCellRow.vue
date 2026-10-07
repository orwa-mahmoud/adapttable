<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    ><template #cell="{ row }">{{ row.amount }}</template></DataTable
  >
</template>
