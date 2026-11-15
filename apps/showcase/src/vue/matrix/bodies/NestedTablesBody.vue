<script setup lang="ts">
/** Nested tables: each person's recent orders, in a table under the row. */
import type { ColumnDef } from "@adapttable/vue";
import { h } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { NESTED_HINTS } from "../../../shared/pageHints";
import {
  type DemoOrder,
  demoOrders,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
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
const ROWS = rosterFor("nested-tables");
const PAGE_DEFAULTS = pageDefaultsFor("nested-tables");
const PAGE_LAYOUT = pageLayoutFor("nested-tables");
const columns = peopleColumns({ status: kit.status });
const firstId = ROWS[0]?.id;
const pageFeatures = [
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
const chrome = pageChromeFeatures(kit, { urlKey: "nest" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in NESTED_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="ROWS"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :defaults="PAGE_DEFAULTS"
        :features="features"
      />
    </div>
  </div>
</template>
