<script setup lang="ts">
import { ref } from "vue";

import { type ColumnDef, DataTable } from "../../src";
import {
  type BulkAction,
  type BulkActionContext,
  bulkActions,
} from "../../src/bulk-actions";
import { print } from "../../src/print";
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [{ id: "a", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];
const last = ref("");
function archive(ids: string[], context: BulkActionContext): void {
  last.value = ids.join(",") + String(context.allMatching);
}
const actions: BulkAction[] = [
  { key: "archive", label: "Archive", onClick: archive },
];
const features = [
  bulkActions(actions),
  print(() => {
    last.value = "printed";
  }, true),
];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
    selectable
  /><output>{{ last }}</output>
</template>
