<script setup lang="ts">
import type { ColumnDef } from "@adapttable/vue";
import { darkTheme, NButton, NCard, NConfigProvider } from "naive-ui";
import type { AnchorHTMLAttributes, HTMLAttributes } from "vue";

import { workspaceCopy } from "../../../../../apps/showcase/src/vue/workspace/copy";
import {
  makeOrders,
  money,
  type Order,
  orderKey,
  regionLabel,
  statusLabel,
} from "../../../../../apps/showcase/src/vue/workspace/data";
import { ar } from "../../../../shared/i18n/src/locales/ar";
import { DataTable } from "../../src";
import { densityChooser } from "../../src/density";
import { filters } from "../../src/filters";
import { headerFilters } from "../../src/header-filters";

const query = new URLSearchParams(window.location.search);
const rtl = query.has("rtl");
const locale = rtl ? "ar" : "en";
const text = workspaceCopy[locale];
const rows = makeOrders();
const outsideAttrs: Pick<AnchorHTMLAttributes, "id" | "href"> = {
  id: "outside",
  href: "#portfolio",
};
const portfolioAttrs: Pick<HTMLAttributes, "id"> = { id: "portfolio" };
const columns: readonly ColumnDef<Order>[] = [
  { key: "id", header: text.order, width: 124, sortable: true },
  { key: "customer", header: text.customer, width: 218, sortable: true },
  {
    key: "region",
    header: text.region,
    formatValue: (row) => regionLabel(row.region, locale),
  },
  { key: "owner", header: text.owner },
  {
    key: "status",
    header: text.status,
    formatValue: (row) => statusLabel(row.status, locale),
  },
  {
    key: "amount",
    header: text.amount,
    align: "end",
    formatValue: (row) => money(row.amount, locale),
  },
];
const features = [
  filters<Order>(
    [
      { key: "customer", type: "text", label: text.customer },
      {
        key: "status",
        type: "select",
        label: text.status,
        options: (["Review", "Ready", "Dispatched"] as const).map((value) => ({
          value,
          label: statusLabel(value, locale),
        })),
      },
      { key: "region", type: "checklist", label: text.region },
      { key: "amount", type: "numberRange", label: text.amount },
    ],
    { mode: query.get("mode") === "drawer" ? "drawer" : "popover", tree: true }
  ),
  headerFilters(),
  densityChooser(),
];
</script>

<template>
  <NConfigProvider :theme="query.has('dark') ? darkTheme : null">
    <main
      :dir="rtl ? 'rtl' : 'ltr'"
      style="padding: 20px; display: grid; gap: 20px"
    >
      <NCard :title="text.orders">
        <template #header-extra>
          <NButton v-bind="outsideAttrs" tag="a">{{ text.revenue }}</NButton>
        </template>
        <DataTable
          :data="rows"
          :columns="columns"
          :row-key="orderKey"
          :features="features"
          :labels="rtl ? ar : undefined"
          :dir="rtl ? 'rtl' : 'ltr'"
          :force-mobile="query.has('mobile') ? true : undefined"
          :url-sync="false"
          selectable
        />
      </NCard>
      <NCard v-bind="portfolioAttrs" :title="text.revenue">
        {{ new Intl.NumberFormat(locale).format(rows.length) }} ·
        {{
          money(
            rows.reduce((total, row) => total + row.amount, 0),
            locale
          )
        }}
      </NCard>
    </main>
  </NConfigProvider>
</template>
