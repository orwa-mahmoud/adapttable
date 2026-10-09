<script setup lang="ts">
/** Row reordering: a grip, keyboard moves, and the host writing each move. */
import { applyRowReorder } from "@adapttable/core";
import { shallowRef } from "vue";

import {
  peopleColumns,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const rows = shallowRef<readonly Person[]>(peopleRows());
const log = shallowRef("Drag a grip, or lift a row with Space.");
const features = [
  kit.rowReorder<Person>((from, to, row) => {
    rows.value = applyRowReorder(rows.value, from, to);
    log.value = `Moved ${row.name} from ${String(from + 1)} to ${String(to + 1)}`;
  }),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint"
        >Space lifts a row, arrows move it, Space drops it</span
      >
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 10 }"
        :features="features"
      />
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
