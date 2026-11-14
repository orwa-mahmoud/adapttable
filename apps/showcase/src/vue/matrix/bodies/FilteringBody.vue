<script setup lang="ts">
/** Filters: popover, drawer or header funnels, chips, and URL state. */
import { computed, shallowRef } from "vue";

import { pageLayoutFor } from "../../../casts";
import {
  FILTER_FORMS,
  type FilterForm,
  formShowsFields,
  formShowsHeaderFunnels,
  formShowsTree,
} from "../../../shared/filterForm";
import {
  FILTER_DEFS,
  PEOPLE,
  peopleColumns,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

type FilterLayout = "popover" | "drawer" | "header";

const kit = useShowcaseKit();
const PAGE_LAYOUT = pageLayoutFor("filtering");
const columns = peopleColumns({ status: kit.status });
const layouts: readonly { value: FilterLayout; label: string }[] = [
  { value: "popover", label: "Popover" },
  { value: "drawer", label: "Drawer" },
  { value: "header", label: "Header" },
];
const layout = shallowRef<FilterLayout>("popover");
const form = shallowRef<FilterForm>("both");
const pageFeatures = computed(() => {
  const panel = kit.filters(FILTER_DEFS, {
    mode: layout.value === "drawer" ? "drawer" : "popover",
    tree: formShowsTree(form.value),
    fields: formShowsFields(form.value),
  });
  return formShowsHeaderFunnels(layout.value === "header", form.value)
    ? [panel, kit.headerFilters()]
    : [panel];
});
const chrome = pageChromeFeatures(kit, { urlKey: "flt" });
const features = computed(() => [...pageFeatures.value, ...chrome]);
function changeLayout(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const value = event.target.value;
  const option = layouts.find((candidate) => candidate.value === value);
  if (option) layout.value = option.value;
}
function changeForm(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const value = event.target.value;
  const option = FILTER_FORMS.find((candidate) => candidate.value === value);
  if (option) form.value = option.value;
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
      <label class="angular-select">
        Filter form
        <select :value="form" @change="changeForm">
          <option
            v-for="option in FILTER_FORMS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
    <div class="mx-demo__body">
      <!-- A new layout or form remounts the table, as React's `key` does. -->
      <component
        :is="kit.DataTable"
        :key="`${layout}-${form}`"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="flt"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :features="features"
      />
    </div>
  </div>
</template>
