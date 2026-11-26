<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { selection } from "@adapttable/vue-unstyled/selection";

const rows = [{ id: "a" }];
const onSelection = (ids: number[]) => ids.length;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'id' }]"
    :row-key="(row) => row.id"
    :features="[selection({ onSelectionChange: onSelection })]"
  />
</template>
