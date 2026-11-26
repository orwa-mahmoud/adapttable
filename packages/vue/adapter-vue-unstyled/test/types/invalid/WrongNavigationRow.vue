<script setup lang="ts">
import { type CellEdit, DataTable } from "@adapttable/vue-unstyled";
import { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
interface Row {
  id: string;
  score: number;
}
const rows: Row[] = [{ id: "a", score: 1 }];
function fill(edits: CellEdit<{ other: string }>[]): void {
  edits.forEach((edit) => String(edit.row.other));
}
const features = [cellNavigation<Row>({ onFill: fill })];
</script>
<template>
  <!-- @vue-generic {Row} -->
  <DataTable
    :data="rows"
    :columns="[{ key: 'score' }]"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
