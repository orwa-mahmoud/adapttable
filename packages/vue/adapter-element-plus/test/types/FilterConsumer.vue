<script setup lang="ts">
import type { FilterFormSource, TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
const labels = resolveLabels(undefined);
import {
  ChecklistFilter,
  FilterField,
  FilterTreeBuilder,
  type FilterDef,
} from "../../src/filters";
interface Row {
  id: string;
  name: string;
}
const def: FilterDef<Row> = {
  key: "name",
  type: "checklist",
  getValue: (row) => row.name,
};
const source: FilterFormSource<Row> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
  allFilteredRows: [{ id: "a", name: "Ada" }],
};
const tree: Pick<TableSource<Row>, "filterTree" | "setFilterTree"> = {
  setFilterTree: () => undefined,
};
</script>
<template>
  <ChecklistFilter :def="def" :source="source" />
  <FilterField :def="def" :source="source" :labels="labels" />
  <FilterTreeBuilder :defs="[def]" :source="tree" default-expanded />
</template>
