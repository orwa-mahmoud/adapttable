<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  buildFormulaColumns,
  useFormulaUrlState,
} from "@adapttable/vue/formula";
import {
  pivot,
  pivotTableModel,
  usePivotUrlState,
} from "@adapttable/vue/pivot";
import { sparklineColumn } from "@adapttable/vue/sparkline";
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import { PivotPanel } from "@adapttable/vue-unstyled/pivot";
import { rowDetail } from "@adapttable/vue-unstyled/row-detail";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import { virtualize } from "@adapttable/vue-unstyled/virtualize";
import { computed, h, shallowRef } from "vue";
interface Sale {
  id: string;
  team: string;
  amount: number;
  cost: number;
  history: readonly number[];
}
const rows = shallowRef<readonly Sale[]>(
  Array.from({ length: 1000 }, (_, index) => ({
    id: `sale-${index}`,
    team: index % 2 ? "Research" : "Platform",
    amount: index * 2 + 10,
    cost: index + 4,
    history: [index, index + 4, index + 2, index + 6],
  }))
);
const rtl = shallowRef(false);
const mobile = shallowRef(false);
const accept = shallowRef(true);
const enabled = shallowRef(true);
const requests = shallowRef(0);
const grouped = shallowRef(false);
const labels = computed(() => getLabels(rtl.value ? "ar" : "en"));
const formulas = useFormulaUrlState({
  urlKey: "demo",
  defaultFormulas: [
    { key: "profit", header: "Profit", formula: "amount-cost" },
  ],
});
const columns = computed<readonly ColumnDef<Sale>[]>(() => [
  { key: "team", header: "Team", groupable: true },
  { key: "amount", header: "Amount", type: "number", aggregatable: true },
  ...buildFormulaColumns<Sale>(formulas.formulas.value).columns,
  sparklineColumn<Sale>({
    key: "history",
    header: "Trend",
    values: (row) => row.history,
  }),
  ...Array.from({ length: 24 }, (_, index) => ({
    key: `metric-${index}`,
    header: `Metric ${index}`,
    accessor: (row: Sale) => row.amount + index,
  })),
]);
const reorder = rowReorder<Sale>((from, to) => {
  requests.value++;
  if (!accept.value) return;
  const next = [...rows.value];
  const [row] = next.splice(from, 1);
  if (row) next.splice(to, 0, row);
  rows.value = next;
});
const features = computed(() =>
  enabled.value
    ? [
        virtualize({
          maxHeight: 360,
          virtualOverscan: 3,
          virtualizeColumns: true,
        }),
        rowDetail<Sale>((row) =>
          h(
            "div",
            { style: { minHeight: "180px" } },
            `Order detail for ${row.id}`
          )
        ),
        reorder,
        ...(grouped.value ? [groupingPanel<Sale>(["team"])] : []),
      ]
    : []
);
const pivotState = usePivotUrlState({
  urlKey: "report",
  defaultConfig: {
    rows: ["team"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  },
});
const pivotModel = computed(() =>
  pivotTableModel(
    pivot(rows.value, pivotState.config.value, {
      collapsed: pivotState.collapsed.value,
    }),
    { labels: labels.value }
  )
);
const rowKey = (row: Sale) => row.id;
</script>
<template>
  <main :dir="rtl ? 'rtl' : 'ltr'">
    <h1>Vue Unstyled specialized data views</h1>
    <label><input v-model="rtl" type="checkbox" />Arabic and RTL</label>
    <label><input v-model="mobile" type="checkbox" />Mobile cards</label>
    <label><input v-model="accept" type="checkbox" />Accept row moves</label>
    <label><input v-model="enabled" type="checkbox" />Enable features</label>
    <label><input v-model="grouped" type="checkbox" />Group rows</label>
    <output aria-live="polite">Move requests: {{ requests }}</output>
    <DataTable
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="features"
      :defaults="{ limit: 1000 }"
      pagination-mode="infinite"
      :force-mobile="mobile"
      :labels="labels"
      :dir="rtl ? 'rtl' : 'ltr'"
      :url-sync="false"
      table-label="Virtual sales"
    />
    <h2>Pivot configuration</h2>
    <PivotPanel
      :fields="[
        { key: 'team', label: 'Team' },
        { key: 'amount', label: 'Amount' },
      ]"
      :config="pivotState.config.value"
      :labels="labels"
      :on-change="pivotState.onConfigChange"
    />
    <DataTable
      :data="pivotModel.rows"
      :columns="pivotModel.columns"
      :row-key="pivotModel.rowKey"
      :features="[pinnedSummaryRows(pivotModel.pinnedRows ?? {})]"
      :labels="labels"
      :dir="rtl ? 'rtl' : 'ltr'"
      :url-sync="false"
      :searchable="false"
      table-label="Pivot sales"
    />
  </main>
</template>
