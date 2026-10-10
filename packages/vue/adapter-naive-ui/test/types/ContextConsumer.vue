<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import { commandPalette } from "@adapttable/naive-ui/command-palette";
import { contextMenu } from "@adapttable/naive-ui/context-menu";
import { ref } from "vue";
interface Person {
  id: string;
  name: string;
}
const data: Person[] = [{ id: "a", name: "Ada" }];
const columns: ColumnDef<Person>[] = [{ key: "name" }];
const open = ref(false);
const observed: unknown[] = [];
const features = [
  commandPalette({
    open,
    onOpenChange: (value) => {
      open.value = value;
    },
    commands: [
      {
        key: "record",
        label: "Record",
        onSelect: () => {
          observed.push("command");
        },
      },
    ],
  }),
  contextMenu<Person>({
    items: (target) => [
      {
        key: "inspect",
        label: "Inspect",
        onSelect: () => {
          observed.push(target);
        },
      },
    ],
  }),
];
</script>
<template>
  <output>{{ observed.length }}</output>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
