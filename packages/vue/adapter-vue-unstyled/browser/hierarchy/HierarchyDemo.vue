<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { grouping, rowDetail, tree } from "@adapttable/vue-unstyled/features";
import { h, shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
  team: string;
  score: number;
  parent?: string;
}
const rows: readonly Person[] = [
  { id: "ada", name: "Ada", team: "Core", score: 10 },
  { id: "bea", name: "Bea", team: "Core", score: 20, parent: "ada" },
  { id: "cal", name: "Cal", team: "Design", score: 30 },
];
const columns = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
  { key: "score", header: "Score" },
];
const ids = shallowRef<readonly string[]>([]);
const rtl = shallowRef(false);
const grouped = [
  grouping<Person>("team", {
    groupFooters: true,
    groupRowPageSize: 1,
    groupAggregates: (data) => ({
      score: data.reduce((sum, row) => sum + row.score, 0),
    }),
  }),
];
const hierarchy = [
  tree<Person>({
    getParentId: (row) => row.parent,
    expandedIds: ids,
    onExpandedIdsChange: (next) => {
      ids.value = next;
    },
  }),
  rowDetail<Person>((row) => h("p", `Details for ${row.name}`)),
];
const rowKey = (row: Person) => row.id;
</script>
<template>
  <main :dir="rtl ? 'rtl' : 'ltr'">
    <button type="button" @click="rtl = !rtl">Toggle RTL</button>
    <section data-hierarchy-table="groups">
      <DataTable
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :features="grouped"
        :url-sync="false"
        :dir="rtl ? 'rtl' : 'ltr'"
        table-label="Grouped people"
      />
    </section>
    <section data-hierarchy-table="tree">
      <DataTable
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :features="hierarchy"
        :url-sync="false"
        :dir="rtl ? 'rtl' : 'ltr'"
        table-label="People hierarchy"
      />
    </section>
  </main>
</template>
