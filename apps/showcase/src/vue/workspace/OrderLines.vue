<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  type ColumnDef,
  DataTable,
  type TableDensity,
} from "@adapttable/vue-unstyled";
import { computed } from "vue";

import { workspaceCopy } from "./copy";
import { money, type Order, type OrderLine, type WorkspaceProps } from "./data";
const props = defineProps<
  WorkspaceProps & { order: Order; density?: TableDensity }
>();
const text = computed(() => workspaceCopy[props.locale]);
const columns = computed<readonly ColumnDef<OrderLine>[]>(() => [
  { key: "product", header: text.value.product },
  {
    key: "quantity",
    header: text.value.quantity,
    type: "number",
    align: "end",
  },
  {
    key: "price",
    header: text.value.unitPrice,
    align: "end",
    formatValue: (row) => money(row.price, props.locale),
  },
  {
    key: "subtotal",
    header: text.value.subtotal,
    align: "end",
    accessor: (row) => row.quantity * row.price,
    formatValue: (row) => money(row.quantity * row.price, props.locale),
  },
]);
</script>
<template>
  <div class="order-lines">
    <p class="order-lines__title">
      <strong>{{ text.rowDetails }}</strong
      ><span>{{ order.id }} · {{ order.customer }}</span>
    </p>
    <DataTable
      :data="order.lines"
      :density="density"
      :columns="columns"
      :row-key="(row) => row.id"
      :labels="getLabels(locale)"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      :locale="locale"
      :force-mobile="mobile"
      :url-sync="false"
      :searchable="false"
      :table-label="`${text.rowDetails} · ${order.id}`"
    />
  </div>
</template>
