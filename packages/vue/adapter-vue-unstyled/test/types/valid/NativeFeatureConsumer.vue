<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { resizableColumns } from "@adapttable/vue-unstyled/resizable-columns";
import { grouping } from "@adapttable/vue-unstyled/grouping";
import { rowDetail } from "@adapttable/vue-unstyled/row-detail";
import { cellSpan } from "@adapttable/vue-unstyled/cell-span";
import { extraRows } from "@adapttable/vue-unstyled/extra-rows";
import { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import { rowActions } from "@adapttable/vue-unstyled/row-actions";
import { rowAppearance } from "@adapttable/vue-unstyled/row-appearance";
import { rowPinning } from "@adapttable/vue-unstyled/row-pinning";
import { tree } from "@adapttable/vue-unstyled/tree";
import { h, shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
  team: string;
  age: number;
  parent?: string;
}
const rows: readonly Person[] = [
  { id: "a", name: "Ada", team: "Core", age: 28 },
];
const age: ColumnDef<Person, number> = {
  key: "age",
  accessor: (row) => row.age,
  cell: ({ value }) => value.toFixed(),
};
const columns: readonly ColumnDef<Person>[] = [{ key: "name" }, age];
const ids = shallowRef<readonly string[]>([]);
const features = [
  grouping<Person>("team", {
    groupAggregates: (data) => ({
      age: data.reduce((sum, row) => sum + row.age, 0),
    }),
  }),
  tree<Person>({
    getParentId: (row) => row.parent,
    expandedIds: ids,
    onExpandedIdsChange: (next) => {
      ids.value = next;
    },
  }),
  rowDetail<Person>((row) => h("p", row.name)),
  rowActions<Person>([
    { key: "open", label: "Open", onClick: (row) => row.age.toFixed() },
  ]),
  rowPinning(),
  pinnedSummaryRows<Person>({ top: rows }),
  extraRows([{ key: "note", kind: "fullWidth", render: () => h("p", "Note") }]),
  cellSpan<Person>(({ row }) => (row.age > 0 ? { rowSpan: 1 } : undefined)),
  rowAppearance<Person>({ rowHeight: (row) => row.age }),
  resizableColumns(),
];
const rowKey = (row: Person) => row.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :url-sync="false"
  />
</template>
