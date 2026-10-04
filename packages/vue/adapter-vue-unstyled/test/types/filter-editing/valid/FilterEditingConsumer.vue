<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";
import {
  type FilterDef,
  filters,
  filterTypes,
} from "@adapttable/vue-unstyled/filters";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";
interface Person {
  id: string;
  name: string;
  amount: number;
}
const rows: readonly Person[] = [{ id: "1", name: "Ada", amount: 1 }];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "amount", editable: true, editor: "number" },
];
const definitions: readonly FilterDef<Person>[] = [
  { key: "name", type: "text", label: "Person", getValue: (row) => row.name },
];
const cell = editing<Person>(
  (row, key, nextValue) => {
    return [row.amount.toFixed(), key.toUpperCase(), String(nextValue)];
  },
  {
    onEditRollback: (row, key) => {
      return [row.name.toUpperCase(), key.toUpperCase()];
    },
  }
);
const row = rowEditing<Person>((person, patch) =>
  Promise.resolve([person.name.toUpperCase(), Object.keys(patch)])
);
const batch = batchEditing<Person>((changes) =>
  Promise.resolve(
    changes.map((change) => [
      change.row.amount.toFixed(),
      change.rowId.toUpperCase(),
      Object.keys(change.patch),
    ])
  )
);
const features = [
  filters<Person>(definitions, { mode: "drawer", tree: true }),
  filterTypes([]),
  headerFilters(),
  cell,
  row,
  batch,
  dirtyIndicators(),
  editHistory({ depth: 12 }),
  undoRedoButtons(),
];
const rowKey = (person: Person) => person.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :url-sync="false"
    :force-mobile="true"
    dir="rtl"
    :class-names="{
      filterInput: 'filter',
      editCellEditor: 'editor',
      batchEditBar: 'batch',
      rowEditActions: 'row',
    }"
  />
</template>
