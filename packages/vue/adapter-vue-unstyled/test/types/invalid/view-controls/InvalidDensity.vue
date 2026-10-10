<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
const rows = [{ id: "a" }];
const columns = [{ key: "id" }];
const rowKey = (row: { id: string }): string => row.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    density="dense"
    default-density="tiny"
  />
</template>
