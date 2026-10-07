<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";
import { columnMenu } from "@adapttable/reka-ui/column-menu";
import { editing } from "@adapttable/reka-ui/editing";
import { headerFilters } from "@adapttable/reka-ui/header-filters";
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
