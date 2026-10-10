<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  type ColumnLayoutState,
  useColumnLayoutUrlState,
} from "@adapttable/vue";
import {
  type ColumnInput,
  DataTable,
  type TableDensity,
} from "@adapttable/vue-unstyled";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";
import { computed, shallowRef } from "vue";

const enabled = shallowRef(true);
const rtl = shallowRef(false);
const controlled = shallowRef(false);
const accept = shallowRef(false);
const searchable = shallowRef(true);
const requests = shallowRef<readonly TableDensity[]>([]);
const onDensity = (next: TableDensity): void => {
  requests.value = [...requests.value, next];
  if (accept.value) density.value = next;
};
const density = shallowRef<TableDensity>("comfortable");
const rejectLayout = shallowRef(false);
const {
  layout: columnLayout,
  onLayoutChange,
  flush,
} = useColumnLayoutUrlState({
  urlKey: "view-controls",
});
const onColumnLayout = (next: ColumnLayoutState): void => {
  if (!rejectLayout.value) onLayoutChange(next);
};
const resetColumns = (): void =>
  onLayoutChange({ hidden: [], order: [], pinned: {}, widths: {} });
const applyColumnPreset = (): void =>
  onLayoutChange({
    hidden: ["team"],
    order: ["email", "name", "team"],
    pinned: { name: "start" },
    widths: { name: 240 },
    names: { name: "Owner" },
  });
const labels = computed(() => getLabels(rtl.value ? "ar" : "en"));
const features = computed(() =>
  enabled.value
    ? [
        densityChooser(),
        fullscreen(),
        savedViews({
          storageKey: "vue-view-controls-ci",
          storage: null,
          flushViewState: flush,
        }),
      ]
    : []
);
const rows = [
  { id: "ada", name: "Ada", email: "ada@example.test", team: "Math" },
  { id: "grace", name: "Grace", email: "grace@example.test", team: "Navy" },
];
const columns: readonly ColumnInput<(typeof rows)[number]>[] = [
  {
    header: "Contact",
    collapsedKey: "name",
    children: [
      { key: "name", header: "Name", renameable: true },
      { key: "email", header: "Email" },
    ],
  },
  { key: "team", header: "Team" },
];
const rowKey = (row: { id: string }): string => row.id;
</script>
<template>
  <main>
    <h1>Vue native view controls</h1>
    <p>Density, saved views and browser fullscreen use the native adapter.</p>
    <label
      ><input v-model="enabled" type="checkbox" /> View controls enabled</label
    >
    <label
      ><input v-model="rtl" type="checkbox" /> Arabic / right to left</label
    >
    <label
      ><input v-model="controlled" type="checkbox" /> Reject density
      requests</label
    >
    <label
      ><input v-model="accept" type="checkbox" /> Accept controlled
      density</label
    >
    <label><input v-model="searchable" type="checkbox" /> Search enabled</label>
    <label
      ><input v-model="rejectLayout" type="checkbox" /> Reject column layout
      requests</label
    >
    <button type="button" @click="applyColumnPreset">
      Apply column preset
    </button>
    <button type="button" @click="resetColumns">Reset columns</button>
    <output aria-label="Density requests">{{ requests.join(", ") }}</output>
    <DataTable
      data-demo-table="view-controls"
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="features"
      :density="controlled ? density : undefined"
      :column-layout="columnLayout"
      collapsible-column-groups
      :searchable="searchable"
      :labels="labels"
      :dir="rtl ? 'rtl' : 'ltr'"
      url-key="view-controls"
      :search-debounce-ms="0"
      @update:density="onDensity"
      @update:column-layout="onColumnLayout"
    />
    <DataTable
      data-demo-table="independent"
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="[densityChooser()]"
      url-key="independent"
    />
  </main>
</template>

<style scoped>
main {
  max-width: 72rem;
  margin-inline: auto;
  padding: 1rem;
}
label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-inline-end: 1rem;
  margin-block-end: 0.75rem;
}
output {
  display: block;
  margin-block: 0.5rem;
}
:deep([data-adapttable-part="toolbar"]) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
:deep([data-adapttable-part="views-panel"]) {
  background: Canvas;
  color: CanvasText;
  border: 1px solid currentColor;
  padding: 0.75rem;
  box-sizing: border-box;
}
:deep([data-adapttable-part="views-input"]) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
:deep([data-adapttable-part="root"]:fullscreen) {
  background: Canvas;
  color: CanvasText;
  padding: 1rem;
  overflow: auto;
  box-sizing: border-box;
}
:deep([data-adapttable-part="root"]) {
  margin-block: 1.25rem;
}
</style>
