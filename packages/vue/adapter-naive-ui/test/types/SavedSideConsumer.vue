<script setup lang="ts">
import { type ColumnDef, DataTable } from "@adapttable/naive-ui";
import {
  type SavedView,
  savedViews,
  SavedViewsPanel,
} from "@adapttable/naive-ui/saved-views";
import { sidePanel } from "@adapttable/naive-ui/side-panel";
import { h, shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "a", name: "Ada" }];
const columns: ColumnDef<Person>[] = [{ key: "name" }];
const open = shallowRef<string | null>("views");
const observed: unknown[] = [];
const views: SavedView[] = [{ name: "Personal", search: "" }];
const features = [
  savedViews({ storageKey: "people", storage: null }),
  sidePanel({
    panels: [{ key: "views", label: "Views", content: h("p", "Views") }],
    open,
    onOpenChange: (key) => {
      open.value = key;
    },
  }),
];
const apply = (name: string) => {
  observed.push(name);
};
const rename = (from: string, to: string) => {
  observed.push(from, to);
};
const move = (name: string, delta: -1 | 1) => {
  observed.push(name, delta);
};
</script>
<template>
  <output>{{ observed.length }}</output>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
  />
  <SavedViewsPanel
    :views="views"
    :on-apply="apply"
    :on-rename="rename"
    :on-move="move"
    :on-set-default="apply"
    :on-remove="apply"
  />
</template>
