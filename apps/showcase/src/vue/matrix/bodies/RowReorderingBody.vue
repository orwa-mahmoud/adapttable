<script setup lang="ts">
/**
 * Row reordering: flat, grouped and tree rows, pointer and keyboard moves,
 * a confirm menu on drop, and the host writing each move.
 */
import { computed, shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import { reportsTo } from "../../../people";
import { PEOPLE_GROUP_BY } from "../../../shared/groupingScenario";
import {
  REORDER_HINTS,
  REORDER_SHAPES,
  reorderPeople,
  type ReorderShape,
  withPersonMovedToGroup,
  withPersonMovedUnder,
} from "../../../shared/rowsScenario";
import {
  PEOPLE_GROUPING,
  peopleColumns,
  type Person,
  rowKey,
  SHOWCASE_PRESENTATION,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("row-reordering");
const PAGE_LAYOUT = pageLayoutFor("row-reordering");
const columns = peopleColumns(kit);
const shape = shallowRef<ReorderShape>("flat");
const rows = shallowRef<readonly Person[]>(rosterFor("row-reordering"));
const rtl = SHOWCASE_PRESENTATION.dir === "rtl";
const chrome = pageChromeFeatures(kit, { urlKey: "reorder" });
const features = computed(() => {
  const current = shape.value;
  return [
    ...(current === "grouped"
      ? [kit.groupingPanel([...PEOPLE_GROUP_BY], PEOPLE_GROUPING)]
      : []),
    ...(current === "tree"
      ? [kit.tree<Person>({ getParentId: reportsTo, treeColumn: "person" })]
      : []),
    kit.rowReorder<Person>(
      (from, to, row) => {
        rows.value = reorderPeople(rows.value, from, to, row, current);
      },
      {
        movePolicy: "confirm",
        onGroupMove: (row, _fromGroup, toGroup, position) => {
          rows.value = withPersonMovedToGroup(
            rows.value,
            row,
            toGroup,
            position
          );
        },
        onTreeMove: (row, _fromParent, toParent, position) => {
          rows.value = withPersonMovedUnder(
            rows.value,
            row,
            toParent.id,
            position
          );
        },
      }
    ),
    ...chrome,
  ];
});

/** The page in the other direction: the same page, re-read in that language. */
function toggleDirection(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("locale", rtl ? "en" : "ar");
  window.location.assign(url);
}
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <div class="seg" role="group" aria-label="Row shape">
        <button
          v-for="option in REORDER_SHAPES"
          :key="option.value"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': shape === option.value }"
          :aria-pressed="shape === option.value"
          @click="shape = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <span v-for="hint in REORDER_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
      <button
        type="button"
        class="seg__btn"
        :class="{ 'is-on': rtl }"
        :aria-pressed="rtl"
        @click="toggleDirection"
      >
        RTL
      </button>
    </div>
    <div class="mx-demo__body">
      <!-- A new shape remounts the table, as React's `key` does. -->
      <component
        :is="kit.DataTable"
        :key="shape"
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
