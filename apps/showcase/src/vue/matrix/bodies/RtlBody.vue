<script setup lang="ts">
/** Arabic controls and cell data, through the same filters kit as FilteringBody. */
import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import {
  FILTER_DEFS,
  peopleColumns,
  rowKey,
  SHOWCASE_PRESENTATION,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("rtl");
const PAGE_LAYOUT = pageLayoutFor("rtl");
const rows = rosterFor("rtl");
const columns = peopleColumns({ status: kit.status });
const pageFeatures = [kit.filters(FILTER_DEFS), kit.columnMenu()];
const chrome = pageChromeFeatures(kit, { urlKey: "rtl" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        :table-label="
          SHOWCASE_PRESENTATION.locale === 'ar' ? 'الأشخاص' : 'People'
        "
        url-key="rtl"
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
