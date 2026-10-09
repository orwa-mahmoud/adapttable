<script setup lang="ts">
/** Saved views: name the table's state and pick it again from the menu. */
import {
  FILTER_DEFS,
  PEOPLE,
  peopleColumns,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const features = [
  kit.filters(FILTER_DEFS),
  kit.savedViews({
    storageKey: `adapttable-vue-${kit.key}-demo-views`,
    urlKey: "views",
  }),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Sort or filter, then save the view under a name</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="views"
        :url-sync="false"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :features="features"
      />
    </div>
  </div>
</template>
