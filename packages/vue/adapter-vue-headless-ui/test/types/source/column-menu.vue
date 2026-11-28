<script setup lang="ts">
import { DataTable } from "@adapttable/vue-headless-ui";
import { columnMenu } from "@adapttable/vue-headless-ui/column-menu";
import { editing } from "@adapttable/vue-headless-ui/editing";
import { headerFilters } from "@adapttable/vue-headless-ui/header-filters";
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [{ id: "a", name: "Ada" }];
const features = [columnMenu(), editing<Row>(() => undefined), headerFilters()];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name', editable: true }]"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
