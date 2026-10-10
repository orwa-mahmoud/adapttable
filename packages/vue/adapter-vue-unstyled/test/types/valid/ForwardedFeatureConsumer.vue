<script setup lang="ts">
import {
  type ColumnDef,
  DataTable,
  type DataTableProps,
} from "@adapttable/vue-unstyled";
import { columnMenu } from "@adapttable/vue-unstyled/column-menu";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import { shallowRef } from "vue";

interface RecordRow {
  id: string;
  team: string;
  score: number;
}
type IsAny<T> = 0 extends 1 & T ? true : false;
const rows: readonly RecordRow[] = [
  { id: "record", team: "Platform", score: 10 },
];
const columns: readonly ColumnDef<RecordRow>[] = [
  { key: "team", header: "Team", groupable: true },
  { key: "score", header: "Score" },
];
const lastMove = shallowRef("");
const features = [
  columnMenu(),
  groupingPanel<RecordRow>(["team"]),
  rowReorder<RecordRow>((from, to, row) => {
    const rowIsAny: IsAny<typeof row> = false;
    const id: string = row.id;
    lastMove.value = `${id}:${from}:${to}:${rowIsAny}`;
  }),
] satisfies NonNullable<DataTableProps<RecordRow>["features"]>;
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    data-source-consumer="forwarded-features"
    :class-names="{ columnMenuButton: 'columns', groupingPanel: 'grouping' }"
  />
  <output>{{ lastMove }}</output>
</template>
