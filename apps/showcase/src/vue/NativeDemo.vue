<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  type ColumnDef,
  DataTable,
  type DataTableHandle,
} from "@adapttable/vue-unstyled";
import { computed, shallowRef } from "vue";

import { VUE_NATIVE_BASELINE } from "../../matrix.mjs";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Person[] = [
  { id: "ada", name: "Ada Lovelace", score: 98 },
  { id: "grace", name: "Grace Hopper", score: 96 },
  { id: "katherine", name: "Katherine Johnson", score: 99 },
];
const independent: readonly Person[] = [
  { id: "other", name: "Independent row", score: 1 },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const selectedIds = shallowRef<string[]>([]);
const rtl = shallowRef(false);
const labels = computed(() => getLabels(rtl.value ? "ar" : "en"));
const table = shallowRef<DataTableHandle<Person>>();
const rowKey = (row: Person): string => row.id;
</script>

<template>
  <main class="vue-baseline">
    <header>
      <p class="vue-baseline__eyebrow">AdaptTable · Vue · Native HTML</p>
      <h1>{{ VUE_NATIVE_BASELINE.title }}</h1>
      <p>{{ VUE_NATIVE_BASELINE.description }}</p>
      <p role="note">{{ VUE_NATIVE_BASELINE.notice }}</p>
    </header>
    <section aria-labelledby="people-heading">
      <h2 id="people-heading">People</h2>
      <p>
        The sample rows are local data. Search, sort and select them; the host
        owns the data and selection. No backend is connected.
      </p>
      <div class="vue-baseline__controls">
        <label
          ><input v-model="rtl" type="checkbox" /> Arabic / right to left</label
        >
        <button type="button" @click="table?.focus()">Focus table</button>
      </div>
      <DataTable
        ref="table"
        v-model:selected-ids="selectedIds"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :url-sync="false"
        :defaults="{ limit: 2 }"
        :search-debounce-ms="0"
        :dir="rtl ? 'rtl' : 'ltr'"
        :labels="labels"
        :lang="rtl ? 'ar' : 'en'"
        table-label="People"
        data-demo-table="people"
      />
      <output aria-live="polite" data-demo-selection
        >Selected: {{ selectedIds.join(", ") || "none" }}</output
      >
    </section>
    <section aria-labelledby="independent-heading">
      <h2 id="independent-heading">Independent table</h2>
      <p>
        Its source, search and selection remain separate from the table above.
      </p>
      <DataTable
        :data="independent"
        :columns="columns"
        :row-key="rowKey"
        :url-sync="false"
        table-label="Independent"
        data-demo-table="independent"
      />
    </section>
  </main>
</template>

<style>
.vue-baseline {
  max-width: 64rem;
  margin-inline: auto;
  padding: 1.25rem;
  color: #182126;
  background: #fff;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}
.vue-baseline__eyebrow {
  color: #435867;
  font-size: 0.9rem;
}
.vue-baseline__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.vue-baseline button,
.vue-baseline input,
.vue-baseline select {
  font: inherit;
}
.vue-baseline button {
  padding: 0.35rem 0.6rem;
}
.vue-baseline input[type="search"] {
  max-width: 100%;
  box-sizing: border-box;
}
.vue-baseline [data-adapttable-part="root"] {
  border: 1px solid #647580;
  padding: 1rem;
  margin-block: 1rem;
}
.vue-baseline [data-adapttable-part="toolbar"],
.vue-baseline [data-adapttable-part="footer"],
.vue-baseline [data-adapttable-part="pager"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.vue-baseline [data-adapttable-part="scroll-box"] {
  overflow-x: auto;
  margin-block: 1rem;
}
.vue-baseline th,
.vue-baseline td {
  padding: 0.6rem;
  text-align: start;
  border-bottom: 1px solid #b9c3c9;
}
.vue-baseline [data-adapttable-part="card"] {
  border-bottom: 1px solid #b9c3c9;
  padding-block: 0.6rem;
}
.vue-baseline dd {
  margin-inline: 0;
}
.vue-baseline :focus-visible {
  outline: 3px solid #2673dc;
  outline-offset: 3px;
}
</style>
