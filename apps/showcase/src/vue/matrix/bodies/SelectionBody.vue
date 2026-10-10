<script setup lang="ts">
/** Selection: row and page checkboxes, and bulk actions over the set. */
import { shallowRef } from "vue";

import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const log = shallowRef("Select rows, then run a bulk action.");
const features = [
  kit.bulkActions([
    {
      key: "export",
      label: "Export",
      onClick: (ids) => {
        log.value = `Export: ${ids.join(", ")}`;
      },
    },
    {
      key: "archive",
      label: "Archive",
      onClick: (ids) => {
        log.value = `Archive: ${ids.join(", ")}`;
      },
    },
  ]),
];
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        selectable
        :defaults="{ limit: 10 }"
        :features="features"
      />
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
