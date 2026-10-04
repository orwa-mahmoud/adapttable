<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
const rows = [{ id: "ada", name: "Ada" }];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row: number) => String(row)"
  ></DataTable>
</template>
