<script setup lang="ts">
import { aggregate } from "@adapttable/vue";
import { type ColumnInput, DataTable } from "@adapttable/vue-unstyled";
import { shallowRef } from "vue";

interface Invoice {
  id: string;
  customer: string;
  region: string;
  amount: number;
}
const data: readonly Invoice[] = [
  { id: "1042", customer: "Atelier North", region: "North", amount: 1250 },
  { id: "1043", customer: "Common Ground", region: "South", amount: 810 },
  { id: "1044", customer: "Studio Field", region: "North", amount: 940 },
  { id: "1045", customer: "Westward", region: "West", amount: 1680 },
  { id: "1046", customer: "Cedar House", region: "West", amount: 720 },
  { id: "1047", customer: "Kindred", region: "South", amount: 560 },
];
const columns: readonly ColumnInput<Invoice>[] = [
  {
    header: "Invoice",
    children: [
      { key: "id", header: "Invoice", width: 100, footer: () => "Page total" },
      { key: "customer", width: 230, sortable: true },
      { key: "region", width: 130, sortable: true },
    ],
  },
  {
    key: "amount",
    header: "Amount (USD)",
    mobileLabel: "Amount in USD",
    width: 160,
    align: "end",
    sortable: true,
    formatValue: (row) => currency.format(row.amount),
  },
];
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const summaryRow = aggregate<Invoice>(
  { amount: "sum" },
  { format: (value) => currency.format(Number(value)) }
);
const mobile = shallowRef(false);
const rtl = shallowRef(false);
const hidden = shallowRef(false);
const visible = shallowRef(true);
</script>
<template>
  <main class="footer-demo">
    <p class="eyebrow">AdaptTable · Vue Unstyled</p>
    <h1>A total that follows the view</h1>
    <p>
      Search, sort, and turn the page. The footer sums the invoices on the
      current page. Column footers and the review note remain separate.
    </p>
    <fieldset class="demo-controls">
      <legend>Explore the layout</legend>
      <label><input v-model="mobile" type="checkbox" /> Mobile cards</label>
      <label><input v-model="rtl" type="checkbox" /> Right-to-left</label>
      <label><input v-model="hidden" type="checkbox" /> Hide region</label>
      <label><input v-model="visible" type="checkbox" /> Show table</label>
    </fieldset>
    <DataTable
      v-if="visible"
      data-demo-table="table-footers"
      :data="data"
      :columns="columns"
      :row-key="(row) => row.id"
      :summary-row="summaryRow"
      :force-mobile="mobile"
      :dir="rtl ? 'rtl' : 'ltr'"
      :column-layout="{
        order: [],
        hidden: hidden ? ['region'] : [],
        pinned: { amount: 'end' },
        widths: {},
        names: {},
        collapsedGroups: [],
      }"
      :defaults="{ limit: 2 }"
      :url-sync="false"
      :search-debounce-ms="0"
      pagination-mode="paged"
      table-label="Invoice register"
      selectable
      :class-names="{
        root: 'invoice-table',
        summary: 'totals',
        summaryCell: 'total-cell',
        summaryCard: 'total-card',
        tableFooter: 'review-note',
      }"
    >
      <template #tableFooter>
        <p>
          <strong>Review note</strong> · Demo figures in USD. Footer values
          describe the current page.
        </p>
      </template>
    </DataTable>
  </main>
</template>
<style>
.footer-demo {
  max-width: 960px;
  margin: 3rem auto;
  padding: 0 1.25rem;
  font:
    16px/1.55 system-ui,
    sans-serif;
  color: #193033;
}
.footer-demo h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
  letter-spacing: -0.04em;
}
.footer-demo .eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #3d665f;
}
.footer-demo .demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-block: 1.5rem;
  border: 1px solid #c5d7d0;
  border-radius: 0.7rem;
  padding: 1rem;
}
.footer-demo .invoice-table {
  border: 1px solid #c5d7d0;
  border-radius: 0.8rem;
  overflow: hidden;
}
.footer-demo [data-adapttable-part="toolbar"],
.footer-demo [data-adapttable-part="footer"] {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}
.footer-demo [data-adapttable-part="scroll-box"] {
  overflow: auto;
}
.footer-demo table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.footer-demo th,
.footer-demo td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #dae5e0;
  background: white;
}
.footer-demo th {
  background: #f3f7f5;
  text-align: start;
}
.footer-demo .totals td,
.footer-demo .total-card {
  background: #e7f3ec;
  font-weight: 700;
}
.footer-demo .review-note {
  padding: 0.25rem 1rem;
  background: #f6f8f4;
  border-top: 1px solid #dae5e0;
}
.footer-demo [data-adapttable-part="cards"] {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
}
.footer-demo [data-adapttable-part="card"],
.footer-demo .total-card {
  border: 1px solid #c5d7d0;
  border-radius: 0.6rem;
  padding: 0.5rem 1rem;
}
.footer-demo [data-adapttable-part="card-row"] {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.footer-demo dd {
  margin: 0;
}
.footer-demo input,
.footer-demo select,
.footer-demo button {
  font: inherit;
}
.footer-demo button,
.footer-demo select,
.footer-demo input[type="search"] {
  border: 1px solid #9db5aa;
  border-radius: 0.4rem;
  padding: 0.4rem 0.6rem;
  background: white;
  color: inherit;
}
.footer-demo :focus-visible {
  outline: 3px solid #167c5b;
  outline-offset: 3px;
}
.footer-demo button:disabled {
  opacity: 0.5;
}
</style>
