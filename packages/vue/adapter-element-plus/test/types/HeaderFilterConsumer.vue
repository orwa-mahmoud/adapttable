<script setup lang="ts">
import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import {
  ElementHeaderFilter,
  FilterHeaderControl,
  FilterHeaderRow,
} from "../../src/header-filters";
interface Row {
  name: string;
  amount: number;
}
const def: FilterDef<Row> = {
  key: "name",
  type: "text",
  getValue: (row) => row.name,
};
const source: FilterFormSource<Row> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
  allFilteredRows: [{ name: "Ada", amount: 2 }],
};
const labels = resolveLabels(undefined);
</script>
<template>
  <FilterHeaderControl dir="rtl" :def="def" :source="source" :labels="labels" />
  <ElementHeaderFilter :def="def" :source="source" :labels="labels" />
  <table>
    <thead>
      <FilterHeaderRow
        dir="rtl"
        :columns="[{ key: 'name' }]"
        :defs="[def]"
        :source="source"
        :labels="labels"
      />
    </thead>
  </table>
</template>
