<script setup lang="ts">
import type { TableFeature } from "@adapttable/vue/features";

import GenericTable from "../GenericTable.vue";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  total: number;
}
const rows: readonly Person[] = [{ id: "a", name: "Ada" }];
const invoiceFeature: TableFeature<Invoice> = {
  id: "invoice",
  mount: (context) => {
    context.runtime.rowAt(0)?.total.toFixed(2);
  },
};
</script>
<template>
  <GenericTable
    :data="rows"
    :columns="[{ key: 'name' }]"
    :row-key="(row) => row.id"
    :features="[invoiceFeature]"
  />
</template>
