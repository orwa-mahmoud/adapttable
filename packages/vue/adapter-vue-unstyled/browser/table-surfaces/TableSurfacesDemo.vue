<script setup lang="ts">
import { aggregate, type ColumnInput } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { exportCsv } from "@adapttable/vue-unstyled/export";
import { filters } from "@adapttable/vue-unstyled/filters";
import { rowActions } from "@adapttable/vue-unstyled/row-actions";
import { rowDetail } from "@adapttable/vue-unstyled/row-detail";
import { h, shallowRef } from "vue";

interface Row {
  id: string;
  name: string;
  team: string;
  amount: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", amount: 10 },
  { id: "b", name: "Bea", team: "Design", amount: 20 },
  { id: "c", name: "Cora", team: "Core", amount: 30 },
];
const reviewed = shallowRef(0);
const columns: readonly ColumnInput<Row>[] = [
  {
    header: "People",
    children: [
      {
        key: "name",
        sortable: true,
        width: 180,
        headerActions: ({ label }) =>
          h(
            "button",
            { type: "button", onClick: () => reviewed.value++ },
            `Inspect ${label}`
          ),
      },
      { key: "team", sortable: true, width: 140 },
    ],
  },
  { key: "amount", sortable: true, width: 100 },
];
const mobile = shallowRef(false);
const rtl = shallowRef(false);
const loading = shallowRef(false);
const menu = shallowRef(true);
const shown = shallowRef(true);
const acceptExpansion = shallowRef(false);
const expanded = shallowRef<readonly string[]>([]);
const expansionRequests = shallowRef<readonly string[]>([]);
const lastAction = shallowRef("");
const completeExport = shallowRef<(() => void) | null>(null);
const features = [
  filters<Row>([
    {
      key: "team",
      type: "multiSelect",
      options: [
        { value: "Core", label: "Core" },
        { value: "Design", label: "Design" },
      ],
    },
  ]),
  rowActions<Row>([
    {
      key: "open",
      label: "Open record",
      onClick: (row) => {
        lastAction.value = row.id;
      },
    },
    {
      key: "locked",
      label: "Restricted action",
      disabledReason: () => "Read only",
      onClick: () => undefined,
    },
  ]),
  rowDetail<Row>((row) => h("p", `Details for ${row.name}`), [], {
    expandedRowIds: expanded,
    onExpandedRowIdsChange: (ids) => {
      expansionRequests.value = ids;
      if (acceptExpansion.value) expanded.value = ids;
    },
  }),
  exportCsv<Row>({
    request: () =>
      new Promise<void>((resolve) => {
        completeExport.value = () => {
          completeExport.value = null;
          resolve();
        };
      }),
  }),
];
const summaryRow = aggregate<Row>({ amount: "sum" });
</script>
<template>
  <main class="table-surfaces-demo">
    <h1>Native table controls</h1>
    <p>
      Remove filters, sort several columns, open row actions, and switch between
      table and card layouts.
    </p>
    <fieldset>
      <legend>Explore the table</legend>
      <label><input v-model="mobile" type="checkbox" /> Mobile cards</label>
      <label><input v-model="rtl" type="checkbox" /> Right-to-left</label>
      <label><input v-model="loading" type="checkbox" /> Loading</label>
      <label><input v-model="menu" type="checkbox" /> Actions menu</label>
      <label
        ><input v-model="acceptExpansion" type="checkbox" /> Accept expansion
        requests</label
      >
      <label><input v-model="shown" type="checkbox" /> Show table</label>
      <button v-if="completeExport" type="button" @click="completeExport?.()">
        Complete export
      </button>
    </fieldset>
    <p>
      <output aria-label="Last row action">{{ lastAction }}</output>
    </p>
    <p>
      <output aria-label="Header reviews">{{ reviewed }}</output>
    </p>
    <p>
      <output aria-label="Expansion requests">{{
        JSON.stringify(expansionRequests)
      }}</output>
    </p>
    <DataTable
      v-if="shown"
      data-demo-table="table-surfaces"
      :data="loading ? [] : data"
      :columns="columns"
      :row-key="(row) => row.id"
      :features="features"
      :summary-row="summaryRow"
      :defaults="{ extra: { team: ['Core', 'Design'] } }"
      :default-column-layout="{ pinned: { name: 'start' } }"
      :force-mobile="mobile"
      :dir="rtl ? 'rtl' : 'ltr'"
      :is-loading="loading"
      :skeleton-rows="3"
      :row-actions-layout="menu ? 'menu' : 'buttons'"
      :url-sync="false"
      :search-debounce-ms="0"
      table-label="People"
      selectable
      multi-sort
    >
      <template #headerActions="{ column }"
        ><span v-if="column.key === 'amount'">USD</span></template
      >
    </DataTable>
  </main>
</template>
<style scoped>
.table-surfaces-demo {
  max-width: 960px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}
fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}
:deep(table) {
  border-collapse: collapse;
  width: 100%;
}
:deep(th),
:deep(td) {
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
  text-align: start;
}
:deep([data-adapttable-part="toolbar"]),
:deep([data-adapttable-part="chips"]) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
}
:deep([data-adapttable-part="chips"]) {
  list-style: none;
}
:deep([data-adapttable-part="chip"]) {
  border: 1px solid #bbb;
  border-radius: 1rem;
  padding: 0.25rem 0.5rem;
}
:deep([data-adapttable-part="sort-index"]) {
  margin-inline-start: 0.5rem;
}
:deep([data-adapttable-part="header-actions"]) {
  display: inline-block;
  margin-inline-start: 0.75rem;
}
:deep([data-adapttable-part="card"]),
:deep([data-adapttable-part="loading-card"]) {
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-block: 0.75rem;
}
:deep([data-adapttable-part="loading-line"]) {
  margin-block: 0.6rem;
}
:deep([data-adapttable-part="export-spinner"]) {
  margin-inline-end: 0.4rem;
}
</style>
