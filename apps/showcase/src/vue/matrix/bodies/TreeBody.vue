<script setup lang="ts">
/**
 * Tree: the seed's org chart — each team's lead first, everyone else on the
 * team under them — one page of thirty so no branch splits across pages.
 */
import {
  PEOPLE,
  peopleColumns,
  type Person,
  reportsTo,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const features = [
  kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" }),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Each team lead opens onto their team</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 30 }"
        :features="features"
      />
    </div>
  </div>
</template>
