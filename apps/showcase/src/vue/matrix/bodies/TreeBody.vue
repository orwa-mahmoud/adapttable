<script setup lang="ts">
/**
 * Tree: the shared tree page — the tree cast under its root, one page of
 * thirty so no branch splits across pages.
 */
import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { TREE_HINTS, TREE_URL_KEY } from "../../../shared/treeScenario";
import {
  peopleColumns,
  type Person,
  reportsTo,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("tree");
const PAGE_LAYOUT = pageLayoutFor("tree");
const rows = rosterFor("tree");
const columns = peopleColumns({ status: kit.status });
const pageFeatures = [
  kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" }),
];
const chrome = pageChromeFeatures(kit, { urlKey: TREE_URL_KEY });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in TREE_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-key="TREE_URL_KEY"
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
