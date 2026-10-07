<script setup lang="ts">
import { type ColumnDef, useColumnLayout } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import { DataTable } from "../../src";
import { ColumnMenu, columnMenu } from "../../src/column-menu";

interface Person {
  id: string;
  name: string;
}
const rows: readonly Person[] = [{ id: "a", name: "Ada" }];
const columns: readonly ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (row) => row.name,
    renameable: true,
  },
];
const layout = useColumnLayout(columns, {});
const labels = resolveLabels(undefined);
const features = [columnMenu()];
const autoSize = () => undefined;
</script>

<template>
  <!-- @vue-generic {Person} -->
  <ColumnMenu
    :all-columns="columns"
    :layout="layout"
    :labels="labels"
    :on-auto-size="autoSize"
    dir="rtl"
  />
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
