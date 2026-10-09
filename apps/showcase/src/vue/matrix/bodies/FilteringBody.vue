<script setup lang="ts">
/** Filters: popover, drawer or header funnels, chips, and URL state. */
import { computed, shallowRef } from "vue";

import {
  FILTER_DEFS,
  PEOPLE,
  peopleColumns,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

type FilterLayout = "popover" | "drawer" | "header";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const layouts: readonly { value: FilterLayout; label: string }[] = [
  { value: "popover", label: "Popover" },
  { value: "drawer", label: "Drawer" },
  { value: "header", label: "Header" },
];
const layout = shallowRef<FilterLayout>("popover");
const features = computed(() =>
  layout.value === "header"
    ? [kit.filters(FILTER_DEFS), kit.headerFilters()]
    : [kit.filters(FILTER_DEFS, { mode: layout.value })]
);
function changeLayout(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const value = event.target.value;
  const option = layouts.find((candidate) => candidate.value === value);
  if (option) layout.value = option.value;
}
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Filters opens the popover or the drawer</span>
      <span class="hint">Advanced sits at the top of that panel</span>
      <span class="hint">Header funnels filter one column</span>
      <label class="angular-select">
        Filter layout
        <select :value="layout" @change="changeLayout">
          <option
            v-for="option in layouts"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
    <div class="mx-demo__body">
      <!-- A new layout remounts the table, as React's `key` does. -->
      <component
        :is="kit.DataTable"
        :key="layout"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="flt"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :features="features"
      />
    </div>
  </div>
</template>
