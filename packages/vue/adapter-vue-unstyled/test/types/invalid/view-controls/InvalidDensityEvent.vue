<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
const rows = [{ id: "a" }];
const columns = [{ key: "id" }];
const rowKey = (row: { id: string }): string => row.id;
const wrong = (_value: number): void => undefined;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :on-density-change="wrong"
    @update:density="wrong"
  />
</template>
