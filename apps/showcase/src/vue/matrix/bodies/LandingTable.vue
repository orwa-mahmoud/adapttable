<script setup lang="ts">
/** The landing page composes the kit's real controls into a useful workspace. */
import { aggregate } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import { pageDefaultsFor, seedRoster } from "../../../casts";
import { formatMoney } from "../../../people";
import { PEOPLE_GROUP_BY } from "../../../shared/groupingScenario";
import {
  LANDING_ARRANGEMENTS,
  LANDING_URL_KEY,
  type LandingArrangement,
  landingArrangement,
} from "../../../shared/landingScenario";
import {
  archivePeople,
  peopleBulkActions,
  peopleRowActions,
} from "../../../shared/peopleActions";
import { applyPersonRowEdit } from "../../../shared/peopleTable";
import { withoutPerson } from "../../../shared/rowsScenario";
import {
  applyPersonEdit,
  currentDataLocale,
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
const PAGE_DEFAULTS = pageDefaultsFor("landing");
const rows = shallowRef<readonly Person[]>(seedRoster("landing", false));
const columns = peopleColumns(kit, { editable: true });
const summary = aggregate<Person>(
  { budget: "sum" },
  {
    columns,
    format: (value) => (typeof value === "number" ? formatMoney(value) : ""),
  }
);
const arrangement = shallowRef<LandingArrangement>(landingArrangement());
const chrome = pageChromeFeatures(kit, {
  editing: true,
  statusBar: true,
  urlKey: LANDING_URL_KEY,
});
const baseFeatures = [
  kit.filters(FILTER_DEFS),
  kit.columnMenu(),
  kit.savedViews({
    storageKey: `adapttable-vue-${kit.key}-${LANDING_URL_KEY}-views`,
    urlKey: LANDING_URL_KEY,
  }),
  kit.editing<Person>((row, key, value) => {
    rows.value = applyPersonEdit(rows.value, row, key, value);
  }),
  // The row actions' pencil opens the row's own form beside cell editing.
  kit.rowEditing<Person>((row, patch) => {
    rows.value = applyPersonRowEdit(
      rows.value,
      row,
      patch,
      currentDataLocale()
    );
  }),
  kit.editHistory(),
  kit.undoRedoButtons(),
  kit.cellNavigation(),
  kit.bulkActions(
    peopleBulkActions(currentDataLocale(), {
      onArchive: (ids) => {
        rows.value = archivePeople(rows.value, ids);
      },
    })
  ),
  kit.rowActions(
    peopleRowActions(currentDataLocale(), {
      onDelete: (row) => {
        rows.value = withoutPerson(rows.value, row);
      },
    })
  ),
  kit.exportCsv<Person>({ filename: "people-workspace.csv" }),
  kit.densityChooser(),
  kit.fullscreen(),
];
const features = computed(() => [
  ...baseFeatures,
  ...(arrangement.value === "grouped"
    ? [kit.groupingPanel<Person>([...PEOPLE_GROUP_BY], PEOPLE_GROUPING)]
    : []),
  ...chrome,
]);
</script>

<template>
  <div class="mx-demo mx-demo--overview">
    <div class="hint-row">
      <div class="seg" role="group" aria-label="Row arrangement">
        <button
          v-for="option in LANDING_ARRANGEMENTS"
          :key="option.value"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': arrangement === option.value }"
          :aria-pressed="arrangement === option.value"
          @click="arrangement = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-key="LANDING_URL_KEY"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        selectable
        :defaults="PAGE_DEFAULTS"
        :summary-row="summary"
        :features="features"
      />
    </div>
  </div>
</template>
