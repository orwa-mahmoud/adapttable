<script setup lang="ts">
/** Selection: row and page checkboxes, and bulk actions over the set. */
import { shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { SELECTION_HINTS } from "../../../shared/pageHints";
import {
  archivePeople,
  peopleBulkActions,
} from "../../../shared/peopleActions";
import {
  currentDataLocale,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const rows = shallowRef<readonly Person[]>(rosterFor("selection"));
const PAGE_DEFAULTS = pageDefaultsFor("selection");
const PAGE_LAYOUT = pageLayoutFor("selection");
const columns = peopleColumns(kit);
const pageFeatures = [
  kit.bulkActions(
    peopleBulkActions(currentDataLocale(), {
      onArchive: (ids) => {
        rows.value = archivePeople(rows.value, ids);
      },
    })
  ),
];
const chrome = pageChromeFeatures(kit, { urlKey: "sel" });
const features = [kit.selection(), ...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in SELECTION_HINTS" :key="hint" class="hint">{{
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
