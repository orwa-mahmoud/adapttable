<script setup lang="ts">
import { ref, shallowRef } from "vue";

import { type ColumnDef, DataTable, type DataTableHandle } from "../../src";
import { selection } from "../../src/selection";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: Row[] = [{ id: "a", name: "Ada", score: 92 }];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name" },
  { key: "score", header: "Score" },
];
const selected = ref<string[]>([]);
function changeSelection(ids: string[]): void {
  selected.value = ids;
}
const table = shallowRef<DataTableHandle<Row>>();
const rowKey = (row: Row) => row.id;
</script>

<template>
  <DataTable
    ref="table"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="[
      selection({ selectedIds: selected, onSelectionChange: changeSelection }),
    ]"
    :url-sync="false"
  >
    <template #cell="{ row }"
      >{{ row.name }} {{ row.score.toFixed(2) }}</template
    >
    <template #header="{ column, label }"
      >{{ column.key }} {{ label }}</template
    >
    <template #tableFooter
      ><button type="button" @click="table?.focus()">
        Focus table
      </button></template
    >
  </DataTable>
</template>
