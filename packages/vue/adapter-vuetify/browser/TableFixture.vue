<script setup lang="ts">
import { h, ref } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VMain } from "vuetify/components/VMain";

import { type ColumnDef, DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import VuetifyButton from "../src/controls/VuetifyButton.vue";
import {
  batchEditing,
  type BatchRowEdit,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";
import { findInTable } from "../src/find-in-table";
import { rowDetail } from "../src/row-detail";
import { selectionStats, statusBar } from "../src/status-bar";
import { tree } from "../src/tree";

interface Person {
  id: string;
  name: string;
  team: string;
  parent?: string;
}
const people = ref<readonly Person[]>([
  { id: "beta", name: "Beta", team: "Platform" },
  { id: "alpha", name: "Alpha", team: "Design", parent: "beta" },
  { id: "gamma", name: "Gamma", team: "Operations" },
]);
const editable = ["/editing", "/row-editing", "/batch-editing"].includes(
  location.pathname
);
const columns: readonly ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    editable,
    validate: (value) => (value === "" ? "A name is required" : undefined),
  },
  {
    key: "team",
    header: "Team",
    sortable: true,
    editable,
    editor: { type: "select", options: ["Platform", "Design", "Operations"] },
  },
];
const selectedIds = ref<string[]>([]);
const selectionRequests = ref(0);
const rejectChanges = ref(false);
const decorated = ref(false);
const dark = ref(false);
const rtl = ref(false);
const editRequests = ref(0);
function applyPatch(
  id: string,
  patch: Readonly<Record<string, unknown>>
): void {
  people.value = people.value.map((row) => {
    if (row.id !== id) return row;
    return {
      ...row,
      name: typeof patch.name === "string" ? patch.name : row.name,
      team: typeof patch.team === "string" ? patch.team : row.team,
    };
  });
}
function commitCell(row: Person, key: string, value: unknown): void {
  editRequests.value++;
  applyPatch(row.id, { [key]: value });
}
function commitRow(
  row: Person,
  patch: Readonly<Record<string, unknown>>
): void {
  editRequests.value++;
  applyPatch(row.id, patch);
}
function commitBatch(rows: readonly BatchRowEdit<Person>[]): void {
  editRequests.value++;
  for (const row of rows) applyPatch(row.rowId, row.patch);
}
function pageFeatures() {
  if (location.pathname === "/editing")
    return [
      editing<Person>(commitCell),
      editHistory(),
      undoRedoButtons(),
      dirtyIndicators(),
    ];
  if (location.pathname === "/row-editing")
    return [rowEditing<Person>(commitRow)];
  if (location.pathname === "/batch-editing")
    return [batchEditing<Person>(commitBatch)];
  if (location.pathname === "/navigation")
    return [
      cellNavigation(),
      columnSelectionCheckbox(),
      findInTable({ button: true }),
      selectionStats(),
      statusBar(),
    ];
  if (location.pathname === "/hierarchy")
    return [
      tree<Person>({ getParentId: (row) => row.parent }),
      rowDetail<Person>((row) => h("p", `Team: ${row.team}`)),
    ];
  return [];
}
const features = pageFeatures();

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
          :features="features"
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
        <output v-if="editable" aria-label="Edit requests">{{
          editRequests
        }}</output>
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
