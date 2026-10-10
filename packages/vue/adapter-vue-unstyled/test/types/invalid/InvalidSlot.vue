<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
const rows = [{ id: "ada", name: "Ada" }];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    ><template #cell="{ row }">{{ row.missing }}</template></DataTable
  >
</template>
