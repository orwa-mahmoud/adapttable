<script setup lang="ts">
import { useDataTable, useFrontendData } from "@adapttable/vue";

const data = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name", sortable: true }];
const source = useFrontendData({
  data,
  columns,
  getRowId: (row) => row.id,
  getSortValue: (row) => row.name,
  urlSync: false,
});
const table = useDataTable({ source, columns, rowKey: (row) => row.id });
</script>

<template>
  <article data-custom-layout="headless">
    <button type="button" @click="source.setSort('name', 'desc')">
      Reverse names
    </button>
    <ol>
      <li v-for="row in table.rows.value" :key="row.id">{{ row.name }}</li>
    </ol>
  </article>
</template>
