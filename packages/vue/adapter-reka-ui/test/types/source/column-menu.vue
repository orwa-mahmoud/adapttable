<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";
import { columnMenu } from "@adapttable/reka-ui/column-menu";
const rows = [{ id: "a", name: "Ada" }];
const features = [columnMenu()];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
