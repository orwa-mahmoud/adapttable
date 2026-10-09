<script setup lang="ts">
/** Group and footer totals, matching AggregationDemo.tsx's three surfaces. */
import { aggregate } from "@adapttable/vue";

import { budget, formatMoney } from "../../../people";
import {
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status }).filter((column) =>
  ["person", "team", "budget"].includes(column.key)
);
const summary = aggregate<Person>(
  { budget: "sum" },
  {
    columns,
    format: (value) => (typeof value === "number" ? formatMoney(value) : ""),
  }
);
const first = PEOPLE[0];
const features = [
  kit.groupingPanel<Person>("team", {
    groupAggregates: aggregate<Person>({ budget: "sum" }, { columns }),
    groupFooters: true,
  }),
  kit.pinnedSummaryRows<Person>({
    top: first
      ? [
          {
            ...first,
            id: "portfolio-total",
            name: "Portfolio total",
            nameAr: "إجمالي المحفظة",
            team: "",
            teamAr: "",
            budget: PEOPLE.reduce((total, row) => total + budget(row), 0),
          },
        ]
      : [],
  }),
];
</script>

<template>
  <div class="mx-demo">
    <p class="hint">
      Search updates the group and footer totals. The pinned portfolio total
      stays outside the filtered data.
    </p>
    <div class="mx-demo__body mx-scroll">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People budgets"
        url-key="agg"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :summary-row="summary"
        :features="features"
      />
    </div>
  </div>
</template>
