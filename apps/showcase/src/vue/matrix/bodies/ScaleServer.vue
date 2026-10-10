<script setup lang="ts">
/**
 * The server tier: the table asks for a slice and this answers it, deriving
 * each row from its index, so the browser never holds the set and the total
 * the pager reports is the real one.
 */
import { useServerData } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import {
  largePerson,
  peopleColumns,
  type Person,
  rowKey,
  SCALE_ROWS,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const slice = shallowRef({ from: 0, limit: 500 });
const rows = computed(() => {
  const { from, limit } = slice.value;
  return Array.from(
    { length: Math.max(0, Math.min(limit, SCALE_ROWS - from)) },
    (_, index) => largePerson(from + index)
  );
});
const source = useServerData<Person>({
  rows,
  total: SCALE_ROWS,
  urlSync: false,
  paginationMode: "infinite",
  defaults: { limit: 500 },
  onQueryChange: (query) => {
    slice.value = { from: (query.page - 1) * query.limit, limit: query.limit };
  },
});
const features = [kit.virtualize({ estimateRowSize: 48, maxHeight: 480 })];
</script>

<template>
  <component
    :is="kit.DataTable"
    v-bind="TABLE_PRESENTATION"
    table-label="People"
    :url-sync="false"
    :source="source"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
  />
</template>
