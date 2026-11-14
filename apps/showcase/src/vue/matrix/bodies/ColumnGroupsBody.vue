<script setup lang="ts">
/** Column groups: three header groups, each collapsing its own way. */
import { pageDefaultsFor } from "../../../casts";
import {
  groupedPeopleColumns,
  PEOPLE,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("column-groups");
const columns = groupedPeopleColumns(kit.status);
const pageFeatures = [kit.collapsibleColumnGroups()];
const chrome = pageChromeFeatures(kit, { urlKey: "cgrp" });
const features = [...pageFeatures, ...chrome];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Each group header has its own ▼</span>
      <span class="hint">Collapse one to see how it folds</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :defaults="PAGE_DEFAULTS"
        :features="features"
      />
    </div>
  </div>
</template>
