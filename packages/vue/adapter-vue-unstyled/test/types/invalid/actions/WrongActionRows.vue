<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { contextMenu } from "@adapttable/vue-unstyled/context-menu";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
const rows: Person[] = [];
const features = [
  contextMenu<Invoice>({
    items: (target) => [
      {
        key: "x",
        label:
          target.kind === "header"
            ? target.columnKey
            : target.row.amount.toFixed(),
        onSelect: () => undefined,
      },
    ],
  }),
];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
