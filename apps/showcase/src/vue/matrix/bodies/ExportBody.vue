<script setup lang="ts">
/** Export: a CSV of the current view from the toolbar. */
import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const requested = new URLSearchParams(window.location.search).get("scope");
const scope =
  requested === "selected" || requested === "range" ? requested : "page";
const features = [
  kit.exportCsv({ scope }),
  ...(scope === "range" ? [kit.cellNavigation()] : []),
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
        :selectable="scope === 'selected'"
        :features="features"
      />
    </div>
  </div>
</template>
