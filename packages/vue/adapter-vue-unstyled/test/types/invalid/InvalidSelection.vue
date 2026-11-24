<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { selection } from "@adapttable/vue-unstyled/selection";
import { shallowRef } from "vue";
const rows = [{ id: "ada", name: "Ada" }];
const selectedIds = shallowRef([10]);
</script>
<template>
  <DataTable
    :features="[selection({ selectedIds })]"
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
  />
</template>
