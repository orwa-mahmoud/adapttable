<script setup lang="ts">
import { ref } from "vue";

import { type ColumnDef, DataTable } from "../../src";
import { commandPalette } from "../../src/command-palette";
import { contextMenu } from "../../src/context-menu";
import { exportCsv } from "../../src/export";
import { groupingPanel } from "../../src/grouping-panel";
import { rowReorder } from "../../src/row-reorder";
import { savedViews, SavedViewsPanel } from "../../src/saved-views";
import { sidePanel } from "../../src/side-panel";
interface Row {
  id: string;
  team: string;
}
const rows: Row[] = [{ id: "one", team: "Core" }];
const columns: ColumnDef<Row>[] = [{ key: "team", groupable: true }];
const open = ref<string | null>("one");
const features = [
  commandPalette({ button: true }),
  contextMenu<Row>(),
  exportCsv<Row>(),
  groupingPanel<Row>("team"),
  rowReorder<Row>((from, to, row) => {
    console.log(from, to, row.team);
  }),
  savedViews({ storage: null, storageKey: "typed", urlSync: false }),
  sidePanel({
    open,
    onOpenChange: (value) => {
      open.value = value;
    },
    panels: [{ key: "one", label: "One", content: "Content" }],
  }),
];
const noop = () => undefined;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
  /><SavedViewsPanel
    :views="[]"
    :on-apply="noop"
    :on-rename="noop"
    :on-move="noop"
    :on-set-default="noop"
    :on-remove="noop"
  />
</template>
