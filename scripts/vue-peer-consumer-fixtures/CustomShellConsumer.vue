<script setup lang="ts">
import { useDataTableShell } from "@adapttable/vue/adapter";

const shell = useDataTableShell({
  data: [
    { id: "a", name: "Ada" },
    { id: "b", name: "Bea" },
  ],
  columns: [{ key: "name", sortable: true }],
  rowKey: (row) => row.id,
  getSortValue: (row) => row.name,
  urlSync: false,
});
</script>

<template>
  <article data-custom-layout="shell">
    <button type="button" @click="shell.source.value.setSort('name', 'desc')">
      Reverse names
    </button>
    <ol>
      <li v-for="row in shell.table.rows.value" :key="row.id">
        {{ row.name }}
      </li>
    </ol>
  </article>
</template>
