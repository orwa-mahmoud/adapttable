<script setup lang="ts">
/** Column groups: three header groups, each collapsing its own way. */
import { shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { COLUMN_GROUP_HINTS } from "../../../shared/pageHints";
import { peopleRowActions } from "../../../shared/peopleActions";
import { withoutPerson } from "../../../shared/rowsScenario";
import {
  currentDataLocale,
  groupedPeopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const rows = shallowRef<readonly Person[]>(rosterFor("column-groups"));
const PAGE_DEFAULTS = pageDefaultsFor("column-groups");
const PAGE_LAYOUT = pageLayoutFor("column-groups");
const columns = groupedPeopleColumns(kit.status);
const pageFeatures = [
  kit.collapsibleColumnGroups(),
  kit.rowActions(
    peopleRowActions(currentDataLocale(), {
      onDelete: (row) => {
        rows.value = withoutPerson(rows.value, row);
      },
    })
  ),
];
const chrome = pageChromeFeatures(kit, { urlKey: "cgrp" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in COLUMN_GROUP_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :defaults="PAGE_DEFAULTS"
        :features="features"
      />
    </div>
  </div>
</template>
