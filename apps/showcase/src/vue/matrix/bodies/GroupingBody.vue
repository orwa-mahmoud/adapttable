<script setup lang="ts">
/** Grouping: the panel, nested groups, and aggregates in the headers. */
import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const features = [kit.groupingPanel(["team", "status"])];
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="grp"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :features="features"
      />
    </div>
  </div>
</template>
