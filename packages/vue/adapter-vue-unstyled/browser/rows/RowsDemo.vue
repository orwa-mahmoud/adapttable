<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { resizableColumns } from "@adapttable/vue-unstyled/columns";
import {
  extraRows,
  pinnedSummaryRows,
  rowActions,
  rowAppearance,
  rowPinning,
} from "@adapttable/vue-unstyled/rows";
import { h, shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
  { id: "bea", name: "Bea", score: 20 },
]);
const result = shallowRef("");
const rtl = shallowRef(false);
const pins = shallowRef({ top: [] as string[], bottom: [] as string[] });
const reject = shallowRef(false);
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [
  resizableColumns(),
  rowPinning({
    pinnedRowIds: pins,
    onPinnedRowIdsChange: (next) => {
      if (!reject.value)
        pins.value = { top: [...next.top], bottom: [...next.bottom] };
    },
  }),
  rowActions<Person>(
    [
      {
        key: "inspect",
        label: "Inspect",
        onClick: (row) => {
          result.value = `Inspect ${row.name}`;
        },
      },
    ],
    {
      onDuplicateRow: (row) => {
        rows.value = [
          ...rows.value,
          { ...row, id: `${row.id}-copy`, name: `${row.name} copy` },
        ];
      },
      onDeleteRow: (row) => {
        rows.value = rows.value.filter((item) => item.id !== row.id);
      },
    }
  ),
  pinnedSummaryRows<Person>({
    bottom: [{ id: "total", name: "Total", score: 30 }],
  }),
  extraRows([
    {
      key: "note",
      kind: "fullWidth",
      beforeRowId: "bea",
      render: () => h("p", "Host-owned note"),
    },
  ]),
  rowAppearance<Person>({
    rowClassName: (row) => (row.score > 15 ? "high-score" : undefined),
  }),
];
const rowKey = (row: Person) => row.id;
</script>
<template>
  <main :dir="rtl ? 'rtl' : 'ltr'">
    <button type="button" @click="rtl = !rtl">Toggle RTL</button>
    <label><input v-model="reject" type="checkbox" />Reject pin requests</label>
    <output aria-live="polite">{{ result }}</output>
    <DataTable
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="features"
      :dir="rtl ? 'rtl' : 'ltr'"
      :url-sync="false"
      :selectable="true"
      table-label="Native row behaviors"
    />
  </main>
</template>
