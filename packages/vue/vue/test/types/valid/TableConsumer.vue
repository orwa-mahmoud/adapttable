<script setup lang="ts">
import {
  type CellContext,
  type ColumnDef,
  componentRenderer,
  type HeaderContext,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/vue";
import { defineComponent, h, shallowRef } from "vue";

import GenericTable from "../GenericTable.vue";
interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "a", name: "Ada", score: 3 },
]);
const NumberValue = defineComponent({
  props: { value: { type: Number, required: true } },
  setup: (props) => () => h("span", String(props.value)),
});
const score: ColumnDef<Person, number> = {
  key: "score",
  accessor: (row) => row.score,
  cell: componentRenderer<CellContext<Person, number>, typeof NumberValue>(
    NumberValue,
    (context) => ({ value: context.value })
  ),
  headerCell: (context: HeaderContext<Person, number>) =>
    h("span", context.label),
  footer: (context) => context.value?.toFixed(2),
};
const columns: readonly ColumnDef<Person>[] = [{ key: "name" }, score];
const staticFeature: StaticTableFeature = {
  id: "static",
  mount: (context) => {
    context.runtime.view();
  },
};
const awareFeature: TableFeature<Person> = {
  id: "person",
  mount: (context) => {
    context.runtime.rowAt(0)?.name.toUpperCase();
  },
};
const selected = shallowRef<string[]>([]);
</script>
<template>
  <GenericTable
    v-model:selected-ids="selected"
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="[staticFeature, awareFeature]"
    ><template #cell="{ row, value: cellValue }"
      >{{ row.name.toUpperCase() }} {{ cellValue }}</template
    ></GenericTable
  >
</template>
