<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
import { contextMenu } from "@adapttable/quasar/context-menu";
import { filters } from "@adapttable/quasar/filters";
import { rowReorder } from "@adapttable/quasar/row-reorder";
import type { ColumnInput } from "@adapttable/vue";
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
const events: string[] = [];
const features = [
  filters<Person>(),
  contextMenu<Person>({
    items: (target) =>
      target.kind === "header"
        ? []
        : [{ key: "name", label: target.row.name, onSelect: () => undefined }],
  }),
  rowReorder<Person>((from, to, row) => {
    events.push(String(from));
    events.push(String(to));
    events.push(row.age.toFixed());
  }),
];
const selected = ref<string[]>([]);
const rowKey = (person: Person) => person.id;
</script>
<template>
  <output>{{ events.join(", ") }}</output>
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
