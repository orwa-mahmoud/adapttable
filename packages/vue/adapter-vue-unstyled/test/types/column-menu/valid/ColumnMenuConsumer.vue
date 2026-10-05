<script setup lang="ts">
import { type ColumnDef, useColumnLayout } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { DataTable } from "@adapttable/vue-unstyled";
import { ColumnMenu, columnMenu } from "@adapttable/vue-unstyled/column-menu";
interface Person {
  readonly id: string;
  readonly name: string;
}
const data: readonly Person[] = [{ id: "a", name: "Ada" }];
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
const autoSize = (): void => undefined;
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
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
