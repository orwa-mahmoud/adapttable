<script setup lang="ts">
import { DataTable } from "@adapttable/vue-unstyled";
import { shallowRef } from "vue";
const rows = [{ id: "ada", name: "Ada" }];
const selection = shallowRef([10]);
</script>
<template>
  <DataTable
    v-model:selected-ids="selection"
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
  />
</template>
