<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  type ColumnDef,
  DataTable,
  type DataTableHandle,
} from "@adapttable/vue-unstyled";
import { computed, shallowRef } from "vue";

import { VUE_NATIVE_BASELINE, VUE_NATIVE_PAGES } from "../../matrix.mjs";

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
const examples = VUE_NATIVE_PAGES.filter(
  (page) => page.key !== "vue-unstyled" && page.key !== "vue-unstyled-workspace"
);
</script>

<template>
  <main class="vue-baseline">
    <header>
      <p class="vue-baseline__eyebrow">AdaptTable · Vue · Native HTML</p>
      <h1>{{ VUE_NATIVE_BASELINE.title }}</h1>
      <p>{{ VUE_NATIVE_BASELINE.description }}</p>
      <p role="note">{{ VUE_NATIVE_BASELINE.notice }}</p>
    </header>
    <aside class="vue-baseline__workspace" aria-labelledby="workspace-heading">
      <div>
        <p class="vue-baseline__eyebrow">The connected workflow</p>
        <h2 id="workspace-heading">A real workspace. Room to explore.</h2>
        <p>
          Review orders, plan a dispatch, and compare revenue. Try nested
          tables, grouped totals, keyboard navigation, mobile cards, and a local
          assistant together.
        </p>
      </div>
      <a href="./workspace/"
        >Open the order workspace <span aria-hidden="true">↗</span></a
      >
    </aside>
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
    <section aria-labelledby="examples-heading" class="vue-baseline__examples">
      <h2 id="examples-heading">Explore the native features</h2>
      <p>
        Focused examples show how each opt-in feature behaves. The workspace
        above brings them into a connected workflow.
      </p>
      <nav
        class="vue-baseline__example-grid"
        aria-label="Vue native feature examples"
      >
        <a
          v-for="example in examples"
          :key="example.key"
          :href="`./${example.path.replace('unstyled/', '')}/`"
          ><strong>{{ example.title.split(" — ")[0] }}</strong
          ><span>{{ example.description }}</span></a
        >
      </nav>
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
.vue-baseline__workspace {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  margin-block: 2rem;
  background: #edf5ef;
  border: 1px solid #c7d9cd;
  border-radius: 1rem;
}
.vue-baseline__workspace > div {
  flex: 1 1 24rem;
}
.vue-baseline__workspace h2 {
  margin: 0.25rem 0 0.6rem;
}
.vue-baseline__workspace p {
  margin-block: 0.35rem;
}
.vue-baseline__workspace a {
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.8rem 1rem;
  border-radius: 0.55rem;
  background: #195f45;
  color: white;
  font-weight: 650;
  text-decoration: none;
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

<style>
.vue-baseline__examples {
  margin-block: 2.5rem;
}
.vue-baseline__example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 0.75rem;
}
.vue-baseline__example-grid a {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.1rem;
  border: 1px solid #d2ded5;
  border-radius: 0.65rem;
  color: #193d2f;
  text-decoration: none;
}
.vue-baseline__example-grid a:hover {
  background: #f0f6f0;
  border-color: #195f45;
}
.vue-baseline__example-grid span {
  color: #556961;
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
