<script setup lang="ts">
/** The frontend tier: every row in memory, windowed. */
import {
  makeLargeDirectory,
  peopleColumns,
  rowKey,
  SCALE_ROWS,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const rows = makeLargeDirectory(SCALE_ROWS);
const features = [kit.virtualize({ maxHeight: 480 })];
</script>

<template>
  <component
    :is="kit.DataTable"
    v-bind="TABLE_PRESENTATION"
    table-label="People"
    :url-sync="false"
    pagination-mode="infinite"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :defaults="{ limit: SCALE_ROWS }"
    :features="features"
  />
</template>
