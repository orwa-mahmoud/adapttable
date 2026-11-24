<script setup lang="ts">
import { type ColumnInput, DataTable } from "@adapttable/reka-ui";
import { filters } from "@adapttable/reka-ui/filters";
import { selection } from "@adapttable/reka-ui/selection";
import { ref } from "vue";

interface Person {
  id: string;
  name: string;
  age: number;
}
const rows: Person[] = [{ id: "ada", name: "Ada", age: 36 }];
const columns: readonly ColumnInput<Person>[] = [
  { key: "name" },
  { key: "age" },
];
const selected = ref<string[]>([]);
function changeSelection(ids: string[]): void {
  selected.value = ids;
}
const features = [
  selection({ selectedIds: selected, onSelectionChange: changeSelection }),
  filters<Person>(),
];
const rowKey = (person: Person) => person.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="rowKey"
    :url-sync="false"
  >
    <template #cell="{ row }"
      >{{ row.name }} ({{ row.age.toFixed(0) }})</template
    >
  </DataTable>
</template>
