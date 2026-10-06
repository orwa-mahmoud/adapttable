<script setup lang="ts">
import { ref } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VMain } from "vuetify/components/VMain";

import { type ColumnDef, DataTable } from "../src";
import VuetifyButton from "../src/controls/VuetifyButton.vue";

interface Person {
  id: string;
  name: string;
  team: string;
}
const people: readonly Person[] = [
  { id: "beta", name: "Beta", team: "Platform" },
  { id: "alpha", name: "Alpha", team: "Design" },
  { id: "gamma", name: "Gamma", team: "Operations" },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
];
const selectedIds = ref<string[]>([]);
const selectionRequests = ref(0);
const rejectChanges = ref(false);
const decorated = ref(false);
const dark = ref(false);
const rtl = ref(false);

function changeSelection(next: string[]): void {
  selectionRequests.value++;
  if (!rejectChanges.value) selectedIds.value = next;
}
</script>

<template>
  <VApp :theme="dark ? 'dark' : 'light'">
    <VMain>
      <section class="table-fixture">
        <header>
          <h1>People workspace</h1>
          <p>A host-controlled table with Vuetify presentation.</p>
          <nav aria-label="Fixture options">
            <VuetifyButton
              :attrs="{ 'aria-pressed': dark, onClick: () => (dark = !dark) }"
              content="Dark theme"
            />
            <VuetifyButton
              :attrs="{ 'aria-pressed': rtl, onClick: () => (rtl = !rtl) }"
              content="Right to left"
            />
            <VuetifyButton
              :attrs="{
                'aria-pressed': rejectChanges,
                onClick: () => (rejectChanges = !rejectChanges),
              }"
              content="Reject selection"
            />
            <VuetifyButton
              :attrs="{ onClick: () => (decorated = !decorated) }"
              content="Update decoration"
            />
          </nav>
        </header>
        <DataTable
          :data="people"
          :columns="columns"
          :row-key="(row) => row.id"
          :selected-ids="selectedIds"
          :url-sync="false"
          :search-debounce-ms="0"
          :dir="rtl ? 'rtl' : 'ltr'"
          :class-names="{ root: decorated ? 'decorated' : undefined }"
          table-label="People"
          @update:selected-ids="changeSelection"
        />
        <output aria-label="Selected row IDs">{{
          selectedIds.join(",")
        }}</output>
        <output aria-label="Selection requests">{{ selectionRequests }}</output>
      </section>
    </VMain>
  </VApp>
</template>

<style scoped>
.table-fixture {
  max-inline-size: 1120px;
  margin: 40px auto;
  padding: 24px;
}
.table-fixture header {
  margin-block-end: 24px;
}
.table-fixture nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-block-start: 20px;
}
.table-fixture output {
  display: block;
  margin-block-start: 12px;
}
@media (max-width: 600px) {
  .table-fixture {
    margin: 0;
    padding: 16px;
  }
}
</style>
