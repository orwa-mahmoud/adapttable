<script setup lang="ts">
/**
 * Totals that are not data rows: pinned team and grand totals, group
 * footers with budget subtotals, the footer grand total, and a full-width
 * note attached to a row. Filter the set and every total follows.
 */
import { pageLayoutFor, rosterFor } from "../../../casts";
import {
  attachedNote,
  budgetTotalOf,
  pinnedTotals,
} from "../../../shared/aggregationScenario";
import { PEOPLE_GROUP_BY } from "../../../shared/groupingScenario";
import {
  FILTER_DEFS,
  PEOPLE_GROUPING,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_LAYOUT = pageLayoutFor("aggregation");
const columns = peopleColumns({ status: kit.status });
const rows = rosterFor("aggregation");
const anchor = rows[0];
const pageFeatures = [
  kit.groupingPanel<Person>([...PEOPLE_GROUP_BY], PEOPLE_GROUPING),
  kit.pinnedSummaryRows<Person>(pinnedTotals(budgetTotalOf(rows))),
  ...(anchor ? [kit.extraRows([attachedNote(anchor.id, anchor.name)])] : []),
  kit.filters(FILTER_DEFS),
];
const chrome = pageChromeFeatures(kit, { urlKey: "agg" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint"
        >Pinned team total and grand total are not data rows</span
      >
      <span class="hint"
        >Group footers close each team; the table footer is the grand
        total</span
      >
      <span class="hint">Filter the set and every total follows</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People budgets"
        url-key="agg"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :summary-row="PEOPLE_GROUPING.groupAggregates"
        :features="features"
      />
    </div>
  </div>
</template>
