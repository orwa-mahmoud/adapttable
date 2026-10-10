<script setup lang="ts">
import type { ColumnDef, SavedView, SavedViewsStore } from "@adapttable/vue";
import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { h, shallowRef } from "vue";

import { DataTable } from "../../src";
import { commandPalette } from "../../src/command-palette";
import { contextMenu } from "../../src/context-menu";
import { grouping } from "../../src/grouping";
import { rowReorder } from "../../src/row-reorder";
import { savedViews } from "../../src/saved-views";
import { sidePanel } from "../../src/side-panel";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows = shallowRef<readonly Row[]>([
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Bea", team: "Core" },
  { id: "c", name: "Cy", team: "Design" },
]);
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true, sortValue: (row) => row.name },
  { key: "team", header: "Team" },
];
const events = shallowRef<readonly string[]>([]);
const record = (event: string) => {
  events.value = [...events.value, event];
};
const mobile = shallowRef(false);
const dir = shallowRef<"ltr" | "rtl">("ltr");
const shown = shallowRef(true);
const openPanel = shallowRef<string | null>("first");
let storedViews: readonly SavedView[] = [{ name: "Original", search: "" }];
const store: SavedViewsStore = {
  list: () => Promise.resolve(storedViews),
  save: (view) => {
    storedViews = [
      ...storedViews.filter((entry) => entry.name !== view.name),
      view,
    ];
    record("saved:" + view.name);
    return Promise.resolve();
  },
  remove: (name) => {
    storedViews = storedViews.filter((entry) => entry.name !== name);
    record("removed:" + name);
    return Promise.resolve();
  },
};
const features = [
  commandPalette({
    button: true,
    commands: [
      {
        key: "disabled",
        label: "Disabled command",
        disabled: true,
        onSelect: () => record("disabled"),
      },
      { key: "report", label: "Run report", onSelect: () => record("command") },
      {
        key: "pause",
        label: "Pause table",
        onSelect: () => {
          shown.value = false;
          record("paused");
        },
      },
    ],
  }),
  contextMenu<Row>({
    items: () => [
      {
        key: "disabled",
        label: "Disabled action",
        disabled: true,
        onSelect: () => record("disabled"),
      },
      {
        key: "custom",
        label: "Custom action",
        separatorBefore: true,
        onSelect: () => record("context"),
      },
    ],
  }),
  savedViews({ storageKey: "nuxt-workspace-ci", store, urlSync: false }),
  sidePanel({
    open: openPanel,
    onOpenChange: (key) => {
      openPanel.value = key;
    },
    panels: [
      { key: "first", label: "First", content: () => h("p", "First panel") },
      { key: "second", label: "Second", content: () => h("p", "Second panel") },
    ],
  }),
  grouping<Row>("team"),
  rowReorder<Row>(
    (from, to, row) => {
      const next = [...rows.value];
      next.splice(from, 1);
      next.splice(to, 0, row);
      rows.value = next;
      record("reorder");
    },
    {
      movePolicy: "confirm",
      onGroupMove: (row, _from, to) => {
        const team = to.levels.find((level) => level.key === "team")?.value;
        if (typeof team !== "string")
          throw new Error("The target group must name a team.");
        rows.value = rows.value.map((entry) =>
          entry.id === row.id ? { ...entry, team } : entry
        );
        record("group-move");
      },
    }
  ),
];
</script>

<template>
  <UApp :dir="dir">
    <main class="nuxt-workspace-fixture">
      <h1>Nuxt UI workspace feature checks</h1>
      <div class="nuxt-workspace-fixture-controls">
        <UButton data-test="rtl" @click="dir = dir === 'rtl' ? 'ltr' : 'rtl'"
          >Toggle RTL</UButton
        >
        <UButton data-test="mobile" @click="mobile = !mobile"
          >Toggle mobile</UButton
        >
        <UButton data-test="panel" @click="openPanel = 'first'"
          >Open panel</UButton
        >
        <UButton data-test="visibility" @click="shown = !shown">{{
          shown ? "Hide table" : "Show table"
        }}</UButton>
      </div>
      <output data-test="events">{{ events.join(",") }}</output>
      <output data-test="rows">{{
        rows.map((row) => `${row.id}:${row.team}`).join(",")
      }}</output>
      <KeepAlive>
        <DataTable
          v-if="shown"
          :data="rows"
          :columns="columns"
          :row-key="(row) => row.id"
          :features="features"
          :url-sync="false"
          :searchable="false"
          :force-mobile="mobile"
          :dir="dir"
          table-label="People"
        />
      </KeepAlive>
    </main>
  </UApp>
</template>

<style scoped>
.nuxt-workspace-fixture {
  max-width: 72rem;
  margin: auto;
  padding: 1rem;
}
.nuxt-workspace-fixture-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 1rem;
}
output {
  display: block;
  min-height: 1.5rem;
}
</style>
