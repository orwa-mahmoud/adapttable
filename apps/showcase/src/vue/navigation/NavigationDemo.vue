<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
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
import { editHistory, editing } from "@adapttable/vue-unstyled/editing";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";
import { selectionStats, statusBar } from "@adapttable/vue-unstyled/status-bar";
import { computed, shallowRef } from "vue";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Row[]>([
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 30 },
  { id: "alan", name: "Alan", score: 50 },
]);
const enabled = shallowRef(true);
const rtl = shallowRef(false);
const accept = shallowRef(true);
const range = shallowRef<CellRange | null>(null);
const requests = shallowRef(0);
const columns: readonly ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    renameable: true,
    sortable: true,
    editable: true,
  },
  {
    key: "score",
    header: "Score",
    editable: true,
    editor: "number",
    parseValue: Number,
  },
];
function commit(row: Row, key: string, value: unknown): void {
  requests.value += 1;
  if (!accept.value) return;
  rows.value = rows.value.map((item) => {
    if (item.id !== row.id) return item;
    if (key === "name") return { ...item, name: String(value) };
    return { ...item, score: Number(value) };
  });
}
function fill(edits: CellEdit<Row>[]): void {
  for (const edit of edits) commit(edit.row, edit.columnKey, edit.value);
}
const features = computed(() =>
  enabled.value
    ? [
        cellNavigation({
          onRangeChange: (next) => {
            range.value = next;
          },
        }),
        columnSelectionCheckbox(),
        columnMenu(),
        findInTable({ button: true }),
        selectionStats(),
        statusBar(),
        editing<Row>(commit),
        editHistory(),
        savedViews({ storageKey: "vue-navigation-ci", storage: null }),
      ]
    : []
);
const labels = computed(() => getLabels(rtl.value ? "ar" : "en"));
const rowKey = (row: Row): string => row.id;
function replaceRows(): void {
  rows.value = [{ id: "replacement", name: "Replacement", score: 99 }];
}
</script>
<template>
  <main>
    <h1>Vue native navigation</h1>
    <p>
      Arrow through cells, select a range, find a value and fill through host
      callbacks.
    </p>
    <label><input v-model="enabled" type="checkbox" />Navigation enabled</label>
    <label><input v-model="rtl" type="checkbox" />Arabic / right to left</label>
    <label><input v-model="accept" type="checkbox" />Accept edits</label>
    <button type="button" @click="replaceRows">Replace rows</button>
    <output aria-label="Cell range">{{ JSON.stringify(range) }}</output>
    <output aria-label="Edit requests">{{ requests }}</output>
    <DataTable
      data-demo-table="navigation"
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="features"
      :searchable="false"
      :labels="labels"
      :dir="rtl ? 'rtl' : 'ltr'"
      :on-cell-fill="fill"
      :on-cell-paste="fill"
      url-key="navigation"
    />
  </main>
</template>
