<script setup lang="ts">
import { shallowRef } from "vue";

import { type ColumnDef, DataTable } from "../../src";
import { bulkActions } from "../../src/bulk-actions";
import { commandPalette } from "../../src/command-palette";
import { contextMenu } from "../../src/context-menu";
import { exportCsv } from "../../src/export";
import { groupingPanel } from "../../src/grouping-panel";
import { print } from "../../src/print";
import { rowReorder } from "../../src/row-reorder";
import { sidePanel } from "../../src/side-panel";
import { virtualize } from "../../src/virtualize";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada", amount: 4 }];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name" },
  { key: "amount", aggregatable: true },
];
const panel = shallowRef<string | null>("details");
const selected = shallowRef<readonly string[]>([]);
const exportedAmounts = shallowRef<readonly number[]>([]);
const groupKeys = shallowRef<readonly string[]>([]);
const lastAmount = shallowRef("");
const features = [
  bulkActions([
    {
      key: "run",
      label: "Run",
      onClick: (ids) => {
        selected.value = ids.map(String);
      },
    },
  ]),
  print(() => undefined, true),
  exportCsv<Row>({
    scope: "selected",
    request: (payload) => {
      exportedAmounts.value = payload.rows.map((row) => row.amount);
    },
  }),
  groupingPanel<Row>("name", {
    onGroupByChange: (keys) => {
      groupKeys.value = keys.map(String);
    },
  }),
  rowReorder<Row>((_from, _to, row) => {
    lastAmount.value = row.amount.toFixed();
  }),
  commandPalette({
    button: true,
    commands: [{ key: "run", label: "Run", onSelect: () => undefined }],
  }),
  contextMenu<Row>({
    items: () => [
      { key: "custom", label: "Custom", onSelect: () => undefined },
    ],
  }),
  sidePanel({
    panels: [{ key: "details", label: "Details", content: "Details" }],
    open: panel,
    onOpenChange: (value) => {
      panel.value = value;
    },
  }),
  virtualize({ maxHeight: 300 }),
];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
