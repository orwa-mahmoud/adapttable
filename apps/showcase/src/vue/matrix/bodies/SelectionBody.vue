<script setup lang="ts">
/** Selection: row and page checkboxes, and bulk actions over the set. */
import { shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { SELECTION_HINTS } from "../../../shared/pageHints";
import { peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const ROWS = rosterFor("selection");
const PAGE_DEFAULTS = pageDefaultsFor("selection");
const PAGE_LAYOUT = pageLayoutFor("selection");
const columns = peopleColumns(kit);
const log = shallowRef("Select rows, then run a bulk action.");
const pageFeatures = [
  kit.bulkActions([
    {
      key: "export",
      label: "Export",
      onClick: (ids) => {
        log.value = `Export: ${ids.join(", ")}`;
      },
    },
    {
      key: "archive",
      label: "Archive",
      onClick: (ids) => {
        log.value = `Archive: ${ids.join(", ")}`;
      },
    },
  ]),
];
const chrome = pageChromeFeatures(kit, { urlKey: "sel" });
const features = [...pageFeatures, ...chrome];
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
        :data="ROWS"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        selectable
        :defaults="PAGE_DEFAULTS"
        :features="features"
      />
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
