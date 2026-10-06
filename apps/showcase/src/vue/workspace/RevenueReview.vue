<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import { aggregate } from "@adapttable/vue";
import { buildFormulaColumns, formulaDisplay } from "@adapttable/vue/formula";
import {
  measureLabel,
  pivot,
  pivotLeafColumnKey,
  pivotRowCaption,
  pivotTableModel,
  usePivotUrlState,
} from "@adapttable/vue/pivot";
import { sparklineColumn } from "@adapttable/vue/sparkline";
import { type ColumnInput, DataTable } from "@adapttable/vue-unstyled";
import { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
import { editing } from "@adapttable/vue-unstyled/editing";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { useGroupCollapseUrlState } from "@adapttable/vue-unstyled/grouping";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import { PivotPanel } from "@adapttable/vue-unstyled/pivot";
import { statusBar } from "@adapttable/vue-unstyled/status-bar";
import { computed, shallowRef } from "vue";

import { workspaceCopy } from "./copy";
import {
  money,
  type Order,
  orderKey,
  regionLabel,
  statusLabel,
  type WorkspaceProps,
} from "./data";
const props = defineProps<WorkspaceProps & { rows: readonly Order[] }>();
const emit = defineEmits<{ update: [rows: readonly Order[]] }>();
const message = shallowRef("");
const text = computed(() => workspaceCopy[props.locale]);
const collapse = useGroupCollapseUrlState({
  urlKey: "workspace-revenue-groups",
});
const labels = computed(() => getLabels(props.locale));
const columns = computed<readonly ColumnInput<Order>[]>(() => [
  {
    key: "customer",
    header: text.value.customer,
    width: 220,
    sortable: true,
    footer: () => text.value.pageTotal,
  },
  {
    key: "region",
    header: text.value.region,
    width: 160,
    groupable: true,
    formatValue: (row) => regionLabel(row.region, props.locale),
  },
  {
    header: text.value.revenue,
    children: [
      {
        key: "amount",
        header: text.value.amount,
        width: 120,
        align: "end",
        type: "number",
        sortable: true,
        aggregatable: true,
        formatValue: (row) => money(row.amount, props.locale),
      },
      {
        key: "cost",
        editable: true,
        editor: "number",
        parseValue: Number,
        validate: (value) =>
          typeof value === "number" && Number.isFinite(value) && value >= 0
            ? undefined
            : text.value.invalidCost,
        header: text.value.cost,
        width: 120,
        align: "end",
        type: "number",
        aggregatable: true,
        formatValue: (row) => money(row.cost, props.locale),
      },
      ...buildFormulaColumns<Order>([
        {
          key: "profit",
          header: text.value.profit,
          formula: "amount-cost",
          format: (value) =>
            value.kind === "number"
              ? money(value.value, props.locale)
              : formulaDisplay(value),
        },
      ]).columns.map((column) => ({
        ...column,
        width: 120,
        align: "end" as const,
      })),
    ],
  },
  sparklineColumn<Order>({
    key: "history",
    header: text.value.trend,
    values: (row) => row.history,
    width: 180,
  }),
]);
const features = [
  editing<Order>((original, key, value) => {
    if (
      key !== "cost" ||
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0
    )
      return;
    emit(
      "update",
      props.rows.map((row) =>
        row.id === original.id ? { ...row, cost: value } : row
      )
    );
    message.value = `${text.value.costSaved} ${original.id}.`;
  }),
  groupingPanel<Order>(["region"], {
    groupFooters: true,
    collapsedGroupIds: collapse.collapsedGroupIds,
    onCollapsedGroupIdsChange: collapse.onCollapsedGroupIdsChange,
  }),
  cellNavigation(),
  findInTable({ button: true }),
  statusBar(),
  exportCsv<Order>({ scope: "all", filename: "revenue-review.csv" }),
];
const summary = computed(() =>
  aggregate<Order>(
    { amount: "sum", cost: "sum" },
    { format: (value) => money(Number(value), props.locale) }
  )
);
const pivotState = usePivotUrlState({
  urlKey: "workspace-pivot",
  defaultConfig: {
    rows: ["region"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  },
});
const config = pivotState.config;
const fields = computed(() => [
  { key: "region", label: text.value.region },
  { key: "status", label: text.value.status },
  { key: "amount", label: text.value.amount },
  { key: "cost", label: text.value.cost },
]);
const model = computed(() => {
  const result = pivot(props.rows, config.value);
  const table = pivotTableModel(result, {
    fields: fields.value,
    labels: labels.value,
    renderRowHeader: (row) => {
      const caption = pivotRowCaption(row, labels.value);
      return caption === "Review" ||
        caption === "Ready" ||
        caption === "Dispatched"
        ? statusLabel(caption, props.locale)
        : regionLabel(caption, props.locale);
    },
  });
  const aggregationLabels: Readonly<Record<string, string>> = {
    sum: labels.value.selectionSum,
    avg: labels.value.groupingAverage,
    count: labels.value.selectionCount,
    min: labels.value.selectionMin,
    max: labels.value.selectionMax,
  };
  // Only ColumnDef captions change. Pivot paths, row/leaf keys and URL config stay canonical.
  const captions = new Map(
    result.columnLeaves.map((leaf, index) => {
      return [
        pivotLeafColumnKey(index),
        {
          header: measureLabel(leaf.measure, fields.value, aggregationLabels),
          group: leaf.total
            ? [labels.value.pivotTotal]
            : leaf.path.map((caption, depth) => {
                if (config.value.columns[depth] === "region")
                  return regionLabel(caption, props.locale);
                if (
                  config.value.columns[depth] === "status" &&
                  (caption === "Review" ||
                    caption === "Ready" ||
                    caption === "Dispatched")
                )
                  return statusLabel(caption, props.locale);
                return caption;
              }),
        },
      ] as const;
    })
  );
  return {
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      ...captions.get(column.key),
    })),
  };
});
</script>
<template>
  <section class="workspace-view" aria-labelledby="revenue-heading">
    <header class="workspace-view__head">
      <div>
        <p class="workspace-eyebrow">03 / {{ text.revenue }}</p>
        <h2 id="revenue-heading">{{ text.revenueTitle }}</h2>
        <p>{{ text.revenueLead }}</p>
      </div>
    </header>
    <p class="workspace-feedback" role="status">
      {{ message || text.formulaNote }}
    </p>
    <DataTable
      data-workspace-table="revenue"
      :data="rows"
      :columns="columns"
      :row-key="orderKey"
      :features="features"
      :summary-row="summary"
      :labels="labels"
      :locale="locale"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      :force-mobile="mobile"
      :defaults="{ limit: 12 }"
      :default-column-layout="{ pinned: { customer: 'start' } }"
      url-key="workspace-revenue"
      :url-sync="true"
      :table-label="text.revenueTable"
      selectable
    >
      <template #tableFooter
        ><p class="workspace-table-note">{{ text.formulaNote }}</p></template
      >
    </DataTable>
    <div class="workspace-subhead">
      <h3>{{ text.pivot }}</h3>
      <p>{{ text.pivotLead }}</p>
    </div>
    <div class="workspace-pivot">
      <PivotPanel
        :fields="fields"
        :config="config"
        :labels="labels"
        :on-change="pivotState.onConfigChange"
      />
      <DataTable
        data-workspace-table="pivot"
        :data="model.rows"
        :columns="model.columns"
        :row-key="model.rowKey"
        :features="[pinnedSummaryRows(model.pinnedRows ?? {})]"
        :labels="labels"
        :locale="locale"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
        :force-mobile="mobile"
        url-key="workspace-pivot-table"
        :url-sync="true"
        :searchable="false"
        :table-label="text.pivot"
      />
    </div>
    <p class="workspace-table-note">{{ text.scopeNote }}</p>
  </section>
</template>
