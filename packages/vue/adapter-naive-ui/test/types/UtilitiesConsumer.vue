<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import { bulkActions } from "@adapttable/naive-ui/bulk-actions";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "@adapttable/naive-ui/cell-navigation";
import { exportCsv } from "@adapttable/naive-ui/export";
import { findInTable } from "@adapttable/naive-ui/find-in-table";
import { print } from "@adapttable/naive-ui/print";
import { selectionStats, statusBar } from "@adapttable/naive-ui/status-bar";
interface Person {
  id: string;
  name: string;
  amount: number;
}
const rows: Person[] = [{ id: "a", name: "Ada", amount: 2 }];
const columns: ColumnDef<Person>[] = [{ key: "name" }, { key: "amount" }];
const observed: unknown[] = [];
const features = [
  bulkActions([
    {
      key: "record",
      label: "Record",
      onClick: (ids) => {
        observed.push(ids);
      },
    },
  ]),
  cellNavigation({
    onRangeChange: (range) => {
      observed.push(range);
    },
  }),
  columnSelectionCheckbox(),
  exportCsv<Person>({
    request: (request) => {
      observed.push(request.rows?.[0]?.name);
    },
  }),
  findInTable({ button: true }),
  print(() => {
    observed.push("print");
  }, true),
  statusBar(),
  selectionStats(),
];
</script>
<template>
  <output>{{ observed.length }}</output>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
