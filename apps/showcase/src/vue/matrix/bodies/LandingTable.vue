<script setup lang="ts">
/** The landing page composes the kit's real controls into a useful workspace. */
import { aggregate } from "@adapttable/vue";
import { shallowRef } from "vue";

import { formatMoney } from "../../../people";
import {
  applyPersonEdit,
  FILTER_DEFS,
  peopleColumns,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const rows = shallowRef<readonly Person[]>(peopleRows());
const columns = peopleColumns({ editable: true, status: kit.status });
const summary = aggregate<Person>(
  { budget: "sum" },
  {
    columns,
    format: (value) => (typeof value === "number" ? formatMoney(value) : ""),
  }
);
const features = [
  kit.filters(FILTER_DEFS),
  kit.columnMenu(),
  kit.resizableColumns(),
  kit.savedViews({
    storageKey: `adapttable-vue-${kit.key}-overview-views`,
    urlKey: "overview",
  }),
  kit.groupingPanel<Person>([], {
    groupAggregates: aggregate<Person>({ budget: "sum" }, { columns }),
    groupFooters: true,
  }),
  kit.editing<Person>((row, key, value) => {
    rows.value = applyPersonEdit(rows.value, row, key, value);
  }),
  kit.editHistory(),
  kit.undoRedoButtons(),
  kit.cellNavigation(),
  kit.bulkActions([]),
  kit.exportCsv<Person>({ filename: "people-workspace.csv" }),
  kit.densityChooser(),
  kit.fullscreen(),
  kit.statusBar(),
];
</script>

<template>
  <div class="mx-demo mx-demo--overview">
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="overview"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        selectable
        :defaults="{ limit: 10 }"
        :summary-row="summary"
        :features="features"
      />
    </div>
  </div>
</template>
