<script setup lang="ts">
import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  type FilterHeaderRowProps,
} from "@adapttable/vue-unstyled";
import {
  FilterHeaderControl as SubpathControl,
  FilterHeaderRow as SubpathRow,
} from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
}
const source: FilterFormSource<Person> = {
  extra: {},
  setExtra: (_key, _value) => undefined,
  setExtras: (_patch) => undefined,
};
const labels = resolveLabels(undefined);
const row: FilterHeaderRowProps<Person> = {
  columns: [{ key: "name", accessor: (person) => person.name }],
  defs: [{ key: "name", type: "text" }],
  source,
  labels,
};
</script>

<template>
  <FilterHeaderControl
    :def="row.defs[0]!"
    :source="source"
    :labels="labels"
    class-name="compact"
  />
  <SubpathControl :def="row.defs[0]!" :source="source" :labels="labels" />
  <table>
    <thead>
      <FilterHeaderRow v-bind="row" :enabled="false" />
      <SubpathRow v-bind="row" :selection="true" />
    </thead>
  </table>
</template>
