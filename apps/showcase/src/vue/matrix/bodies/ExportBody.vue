<script setup lang="ts">
/**
 * Export: the grouped sheet as a PDF or through a host-run server job, the
 * same view through the browser's print dialog, and a CSV of the flat view
 * by scope (`?scope=page|selected|range`).
 */
import { computed, onMounted, shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import {
  EXPORT_GROUP_BY,
  EXPORT_MODES,
  exportGroups,
  type ExportMode,
  exportNavigatesCells,
  exportScenarioOptions,
  exportSelects,
  initialExportMode,
  loadArabicFont,
  printGroupedPeople,
  requestedExportScope,
} from "../../../shared/exportScenario";
import {
  currentDataLocale,
  PEOPLE_GROUPING,
  peopleColumns,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const ROWS = rosterFor("export");
const PAGE_DEFAULTS = pageDefaultsFor("export");
const PAGE_LAYOUT = pageLayoutFor("export");
const columns = peopleColumns(kit);
const locale = currentDataLocale();
const scope = requestedExportScope() ?? "page";
const mode = shallowRef<ExportMode>(initialExportMode());
const font = shallowRef<ArrayBuffer>();

onMounted(() => {
  if (locale !== "ar") return;
  loadArabicFont()
    .then((bytes) => {
      font.value = bytes;
    })
    .catch((error: unknown) => {
      console.error("the demo font did not load", error);
    });
});

const pageFeatures = computed(() => [
  ...(exportGroups(mode.value)
    ? [kit.groupingPanel([...EXPORT_GROUP_BY], PEOPLE_GROUPING)]
    : []),
  kit.exportCsv(exportScenarioOptions(mode.value, locale, font.value, scope)),
  ...(exportNavigatesCells(mode.value, scope) ? [kit.cellNavigation()] : []),
  kit.print(() => {
    printGroupedPeople(locale, font.value);
  }, true),
]);
const chrome = pageChromeFeatures(kit, { urlKey: "pdf" });
const features = computed(() => [
  ...(exportSelects(mode.value, scope) ? [kit.selection()] : []),
  ...pageFeatures.value,
  ...chrome,
]);
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row" role="group" aria-label="Export mode">
      <span class="hint">Grouped by team, then status</span>
      <button
        v-for="option in EXPORT_MODES"
        :key="option.value"
        type="button"
        :class="['seg__btn', { 'is-on': mode === option.value }]"
        :aria-pressed="mode === option.value"
        :data-demo-control="`export-mode-${option.value}`"
        @click="mode = option.value"
      >
        {{ option.label }}
      </button>
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
        :defaults="PAGE_DEFAULTS"
        :default-column-layout="PAGE_LAYOUT"
        :features="features"
      />
    </div>
  </div>
</template>
