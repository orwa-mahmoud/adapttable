<script setup lang="ts">
/** Pivot axes, measures and folded groups: the shared pivot page. */
import {
  pivot,
  type PivotRow,
  pivotTableModel,
  usePivotUrlState,
} from "@adapttable/vue/pivot";
import { computed, h } from "vue";

import { pivotRoster } from "../../../casts";
import {
  PIVOT_AGGREGATORS,
  PIVOT_FIELDS,
  PIVOT_PAGE_SIZE,
  PIVOT_START,
  pivotCellFormat,
  pivotRowHeader,
} from "../../../shared/pivotScenario";
import { SHOWCASE_PRESENTATION, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const fields = PIVOT_FIELDS;
const rows = pivotRoster();
const state = usePivotUrlState({
  urlKey: "pivot",
  defaultConfig: PIVOT_START,
});

/** A subtotal's stable key is also the collapse key persisted in the URL. */
function toggleFold(key: string): void {
  const next = new Set(state.collapsed.value);
  if (!next.delete(key)) next.add(key);
  state.onCollapsedChange(next);
}

/** A subtotal's caption folds its group with a button the host owns. */
function caption(row: PivotRow) {
  if (row.kind !== "subtotal") return h("span", row.label);
  const folded = state.collapsed.value.has(row.key);
  const closed = SHOWCASE_PRESENTATION.dir === "rtl" ? "◀" : "▶";
  return h(
    "button",
    {
      type: "button",
      class: "pivot-fold",
      "data-testid": "pivot-fold",
      "aria-expanded": !folded,
      onClick: () => toggleFold(row.key),
    },
    [
      h("span", { "aria-hidden": "true" }, folded ? closed : "▼"),
      " ",
      row.label,
    ]
  );
}

const model = computed(() =>
  pivotTableModel(
    pivot(rows, state.config.value, {
      collapsed: state.collapsed.value,
      aggregators: PIVOT_AGGREGATORS,
      format: pivotCellFormat,
    }),
    {
      fields,
      labels: SHOWCASE_PRESENTATION.labels,
      rowHeader: pivotRowHeader(
        state.config.value,
        fields,
        SHOWCASE_PRESENTATION.labels.pivotTotal
      ),
      renderRowHeader: caption,
    }
  )
);
const features = computed(() => [
  kit.pinnedSummaryRows(model.value.pinnedRows ?? {}),
]);
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body" :dir="SHOWCASE_PRESENTATION.dir">
      <component
        :is="kit.PivotPanel"
        :fields="fields"
        :config="state.config.value"
        :on-change="state.onConfigChange"
        :labels="SHOWCASE_PRESENTATION.labels"
      />
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="Budget pivot"
        :url-sync="false"
        :searchable="false"
        :data="model.rows"
        :columns="model.columns"
        :row-key="model.rowKey"
        :defaults="{ limit: PIVOT_PAGE_SIZE }"
        :features="features"
      />
    </div>
  </div>
</template>
