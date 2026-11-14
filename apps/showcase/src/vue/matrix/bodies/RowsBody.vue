<script setup lang="ts">
/** Rows: pin from the 3-dot menu, and merge a team that runs down the page. */
import { shallowRef } from "vue";

import { pageLayoutFor } from "../../../casts";
import {
  orderPeopleByTeam,
  teamSpan,
  withAddedPerson,
  withDuplicatedPerson,
  withoutPerson,
} from "../../../shared/rowsScenario";
import {
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_LAYOUT = pageLayoutFor("rows");
const columns = peopleColumns({ status: kit.status });
const rows = shallowRef<readonly Person[]>(orderPeopleByTeam(PEOPLE));
const pageFeatures = [
  kit.rowPinning(),
  kit.cellSpan(teamSpan),
  kit.rowActions<Person>([], {
    onAddRow: () => {
      rows.value = withAddedPerson(rows.value);
    },
    onDuplicateRow: (row) => {
      rows.value = withDuplicatedPerson(rows.value, row);
    },
    onDeleteRow: (row) => {
      rows.value = withoutPerson(rows.value, row);
    },
  }),
];
const chrome = pageChromeFeatures(kit, { urlKey: "rows" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Open a row's ⋯ menu to pin it</span>
      <span class="hint">A team that runs down the page is one cell</span>
    </div>
    <div class="mx-demo__body mx-scroll">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="rows"
        row-actions-layout="menu"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :defaults="{ limit: 30 }"
        :features="features"
      />
    </div>
  </div>
</template>
