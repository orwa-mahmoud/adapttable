<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";

const rows = [{ id: "a" }];
const onSelection = (ids: number[]) => ids.length;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'id' }]"
    :row-key="(row) => row.id"
    @update:selected-ids="onSelection"
  />
</template>
