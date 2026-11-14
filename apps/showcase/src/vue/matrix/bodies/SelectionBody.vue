<script setup lang="ts">
/** Selection: row and page checkboxes, and bulk actions over the set. */
import { shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor } from "../../../casts";
import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("selection");
const PAGE_LAYOUT = pageLayoutFor("selection");
const columns = peopleColumns({ status: kit.status });
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
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="PEOPLE"
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
