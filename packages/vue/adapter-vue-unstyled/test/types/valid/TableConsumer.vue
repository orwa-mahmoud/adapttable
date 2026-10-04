<script setup lang="ts">
import {
  type ColumnDef,
  DataTable,
  type DataTableHandle,
} from "@adapttable/vue-unstyled";
import { shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
  score: number;
}
const people = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
]);
const selection = shallowRef<string[]>([]);
const table = shallowRef<DataTableHandle<Person>>();
defineExpose({ focusTable: () => table.value?.focus() });
const score: ColumnDef<Person, number> = {
  key: "score",
  accessor: (person) => person.score,
  cell: ({ row, value }) => `${row.name}: ${value.toFixed(2)}`,
};
const columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }, score];
const rowKey = (person: Person): string => person.id;
</script>
<template>
  <DataTable
    ref="table"
    v-model:selected-ids="selection"
    :data="people"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
  >
    <template #cell="{ row, value, column }"
      >{{ row.name }} {{ String(value) }} {{ column.key }}</template
    >
    <template #header="{ column, label, sortDir }"
      >{{ column.key }} {{ label }} {{ sortDir }}</template
    >
  </DataTable>
</template>
