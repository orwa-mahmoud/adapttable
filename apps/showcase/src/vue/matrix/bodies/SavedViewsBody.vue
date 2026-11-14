<script setup lang="ts">
/**
 * Saved views: the views menu on the table and the kit's management panel
 * beside it, over the shared seeded views — one shared and read-only, one
 * upgraded from an older table.
 */
import { useSavedViews } from "@adapttable/vue";
import { computed, h, shallowRef } from "vue";

import { pageLayoutFor, rosterFor } from "../../../casts";
import {
  createSeededViewStorage,
  createViewSession,
  reportingMigration,
  SAVED_VIEWS_STORAGE_KEY,
  SAVED_VIEWS_URL_KEY,
  upgradedFooter,
} from "../../../shared/savedViewsScenario";
import {
  peopleColumns,
  rowKey,
  SHOWCASE_PRESENTATION,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_LAYOUT = pageLayoutFor("saved-views");
const rows = rosterFor("saved-views");
const columns = peopleColumns({ status: kit.status });
const storage = createSeededViewStorage();
// The list and the table both apply a view by writing params into a store
// kept for this visit only: refresh starts clean, the URL never changes.
const session = createViewSession();
const migrated = shallowRef<readonly string[]>([]);
const options = {
  storageKey: SAVED_VIEWS_STORAGE_KEY,
  storage,
  urlKey: SAVED_VIEWS_URL_KEY,
  urlAdapter: session,
};
const views = useSavedViews({
  ...options,
  migrate: reportingMigration((upgraded) => {
    if (!migrated.value.includes(upgraded))
      migrated.value = [...migrated.value, upgraded];
  }),
});
const features = [kit.savedViews(options)];
const footer = computed(() => {
  const text = upgradedFooter(migrated.value);
  return text === undefined
    ? undefined
    : h("span", { "data-testid": "migrated" }, text);
});
</script>

<template>
  <div class="mx-demo">
    <div class="mx-demo__body panel-layout" :dir="SHOWCASE_PRESENTATION.dir">
      <div>
        <component
          :is="kit.SavedViewsPanel"
          :views="views.views.value"
          :on-apply="views.apply"
          :on-rename="views.rename"
          :on-move="views.move"
          :on-set-default="views.setDefault"
          :on-remove="views.remove"
          :labels="SHOWCASE_PRESENTATION.labels"
          :footer="footer"
        />
      </div>
      <div>
        <component
          :is="kit.DataTable"
          v-bind="TABLE_PRESENTATION"
          table-label="People"
          :url-key="SAVED_VIEWS_URL_KEY"
          :url-adapter="session"
          :data="rows"
          :columns="columns"
          :row-key="rowKey"
          :default-column-layout="PAGE_LAYOUT"
          :features="features"
        />
      </div>
    </div>
  </div>
</template>
