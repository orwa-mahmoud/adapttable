<script setup lang="ts">
import type { ColumnDef } from "@adapttable/vue";
import { shallowRef } from "vue";

import { DataTable } from "../../src";
import {
  extraRows,
  pinnedSummaryRows,
  rowAppearance,
  rowPinning,
  type RowPinState,
} from "../../src/rows";
interface Row {
  id: string;
  name: string;
  amount: number;
}
const data: Row[] = [{ id: "a", name: "Ada", amount: 1 }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "amount" }];
const pins = shallowRef<RowPinState>({ top: [], bottom: [] });
const features = [
  rowPinning({
    pinnedRowIds: pins,
    onPinnedRowIdsChange: (next) => {
      pins.value = next;
    },
  }),
  pinnedSummaryRows<Row>({ bottom: [{ id: "sum", name: "Total", amount: 1 }] }),
  extraRows([{ key: "note", kind: "fullWidth", render: () => "Note" }]),
  rowAppearance<Row>({
    rowClassName: (row) => (row.amount > 0 ? "positive" : undefined),
  }),
];
</script>
<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
