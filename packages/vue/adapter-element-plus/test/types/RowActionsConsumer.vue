<script setup lang="ts">
import type { ColumnDef } from "@adapttable/vue";

import { DataTable } from "../../src";
import { rowActions } from "../../src/row-actions";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [{ id: "a", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];
const rowKey = (row: Row) => row.id;
const actions = rowActions<Row>(
  [
    {
      key: "open",
      label: "Open",
      onClick: (row) => row.name.toUpperCase(),
      confirm: {
        title: "Open?",
        message: (row) => row.name,
        confirmLabel: "Open",
      },
    },
  ],
  { onDuplicateRow: (row) => row.id }
);
</script>
<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="rowKey"
    :features="[actions]"
    :url-sync="false"
  />
</template>
