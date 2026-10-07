<script setup lang="ts">
import type { FilterFormSource, TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import {
  ChecklistFilter,
  type FilterDef,
  FilterTreeBuilder,
  VuetifyFilterField,
} from "../../src/filters";
import { FilterHeaderControl } from "../../src/header-filters";

interface Person {
  id: string;
  name: string;
}
const def: FilterDef<Person> = {
  key: "name",
  type: "checklist",
  getValue: (row) => row.name,
};
const source: FilterFormSource<Person> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
  allFilteredRows: [{ id: "a", name: "Ada" }],
};
const tree: Pick<TableSource<Person>, "filterTree" | "setFilterTree"> = {
  setFilterTree: () => undefined,
};
const labels = resolveLabels(undefined);
</script>

<template>
  <ChecklistFilter :def="def" :source="source" />
  <VuetifyFilterField :def="def" :source="source" :labels="labels" />
  <FilterTreeBuilder :defs="[def]" :source="tree" default-expanded />
  <FilterHeaderControl :def="def" :source="source" :labels="labels" dir="rtl" />
</template>
