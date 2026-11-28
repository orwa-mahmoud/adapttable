<script setup lang="ts">
import { useColumnLayout } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import { type ColumnInput, DataTable } from "../../src";
import { ColumnMenu, columnMenu } from "../../src/column-menu";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [{ id: "a", name: "Ada" }];
const columns: ColumnInput<Row>[] = [{ key: "name", renameable: true }];
const flat = [{ key: "name", renameable: true }];
const layout = useColumnLayout<Row>(flat, () => ({}));
const labels = resolveLabels(undefined);
const features = [columnMenu()];
</script>
<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
  />
  <ColumnMenu
    has-row-actions
    has-row-reorder
    :all-columns="flat"
    :layout="layout"
    :labels="labels"
    :on-auto-size="() => undefined"
  />
</template>
