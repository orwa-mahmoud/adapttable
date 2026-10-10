<script setup lang="ts">
import { type ColumnInput, DataTable } from "@adapttable/reka-ui";
import { filters } from "@adapttable/reka-ui/filters";
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
const features = [filters<Person>()];
const selected = ref<string[]>([]);
const rowKey = (person: Person) => person.id;
</script>
<template>
  <DataTable
    v-model:selected-ids="selected"
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="rowKey"
    selectable
    :url-sync="false"
  >
    <template #cell="{ row }"
      >{{ row.name }} ({{ row.age.toFixed(0) }})</template
    >
  </DataTable>
</template>
