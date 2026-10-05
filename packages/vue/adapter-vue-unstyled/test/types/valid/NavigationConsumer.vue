<script setup lang="ts">
import {
  type CellEdit,
  type ColumnDef,
  DataTable,
} from "@adapttable/vue-unstyled";
import {
  cellNavigation,
  type CellRange,
  columnSelectionCheckbox,
} from "@adapttable/vue-unstyled/cell-navigation";
import { columnMenu } from "@adapttable/vue-unstyled/column-menu";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { selectionStats, statusBar } from "@adapttable/vue-unstyled/status-bar";
interface Row {
  id: string;
  score: number;
}
const rows: Row[] = [{ id: "one", score: 1 }];
const columns: ColumnDef<Row>[] = [
  { key: "score", accessor: (row) => row.score, renameable: true },
];
const features = [
  cellNavigation({
    onRangeChange: (range: CellRange | null) => range?.head.col,
  }),
  columnSelectionCheckbox(),
  findInTable({ button: true }),
  statusBar(),
  selectionStats(),
  columnMenu(),
];
function fill(edits: CellEdit<Row>[]): void {
  edits.forEach((edit) => Number(edit.row.score));
}
</script>
<template>
  <!-- @vue-generic {Row} -->
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :on-cell-fill="fill"
  >
    <template #cell="{ row }">{{ row.score.toFixed(1) }}</template>
  </DataTable>
</template>
