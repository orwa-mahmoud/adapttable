<script setup lang="ts">
import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import {
  type ColumnDef,
  DataTable,
  FilterHeaderControl,
  FilterHeaderRow,
} from "../../src";
import { collapsibleColumnGroups } from "../../src/column-groups";
import { fitColumns } from "../../src/fit-columns";
import { multiSort } from "../../src/multi-sort";
import { resizableColumns } from "../../src/resizable-columns";
import { virtualize, type VirtualizeOptions } from "../../src/virtualize";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [{ id: "a", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];
const options: VirtualizeOptions = { maxHeight: 240, virtualOverscan: 2 };
const features = [
  collapsibleColumnGroups(),
  fitColumns(),
  multiSort(),
  resizableColumns(),
  virtualize(options),
];
const def: FilterDef<Row> = {
  key: "name",
  type: "text",
  getValue: (row) => row.name,
};
const source: FilterFormSource<Row> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
};
const labels = resolveLabels(undefined);
</script>
<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row: Row) => row.id"
    :features="features"
    :url-sync="false"
  />
  <FilterHeaderControl :def="def" :source="source" :labels="labels" />
  <table>
    <thead>
      <FilterHeaderRow
        :columns="columns"
        :defs="[def]"
        :source="source"
        :labels="labels"
      />
    </thead>
  </table>
</template>
