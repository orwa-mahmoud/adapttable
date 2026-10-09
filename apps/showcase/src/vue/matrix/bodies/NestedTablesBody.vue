<script setup lang="ts">
/** Nested tables: each person's recent orders, in a table under the row. */
import type { ColumnDef } from "@adapttable/vue";
import { h } from "vue";

import {
  type DemoOrder,
  demoOrders,
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

/** The nested orders table's columns — a different shape from the parent's. */
const ORDER_COLUMNS: ColumnDef<DemoOrder>[] = [
  { key: "item", header: "Item", accessor: (row) => row.item },
  { key: "qty", header: "Qty", accessor: (row) => row.qty, align: "end" },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => `$${row.amount.toLocaleString("en-US")}`,
    align: "end",
  },
];
const orderKey = (order: DemoOrder) => order.id;

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const firstId = PEOPLE[0]?.id;
const features = [
  kit.nestedTable<Person>(
    (row) => ({
      label: `Orders for ${row.name}`,
      // One person's orders: this kit's own table, mounted with the defaults.
      table: (defaults) =>
        h(kit.DataTable, {
          ...TABLE_PRESENTATION,
          ...defaults,
          data: demoOrders(row),
          columns: ORDER_COLUMNS,
          rowKey: orderKey,
        }),
    }),
    firstId ? [firstId] : []
  ),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Open a row to see that person's orders</span>
      <span class="hint">The orders have their own columns and row keys</span>
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
        :defaults="{ limit: 10 }"
        :features="features"
      />
    </div>
  </div>
</template>
