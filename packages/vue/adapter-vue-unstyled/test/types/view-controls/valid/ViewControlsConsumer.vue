<script setup lang="ts">
import {
  DataTable,
  type DataTableClassNames,
  type TableDensity,
} from "@adapttable/vue-unstyled";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import {
  type SavedView,
  savedViews,
  SavedViewsPanel,
} from "@adapttable/vue-unstyled/saved-views";
import { shallowRef } from "vue";
const rows = [{ id: "a", name: "Ada" }];
const columns = [{ key: "name" }];
const rowKey = (row: (typeof rows)[number]): string => row.id;
const density = shallowRef<TableDensity>("comfortable");
const features = [
  densityChooser(),
  fullscreen(),
  savedViews({ storageKey: "views", storage: null }),
];
const names: DataTableClassNames = {
  densitySelect: "density",
  fullscreenButton: "fullscreen",
  viewsMenu: "menu",
  viewsButton: "button",
  viewsPanel: "panel",
  viewsRow: "row",
  viewsItem: "item",
  viewsDelete: "delete",
  viewsDivider: "divider",
  viewsSaveRow: "save-row",
  viewsInput: "input",
  viewsSave: "save",
};
const views: readonly SavedView[] = [
  { name: "First", search: "density=compact" },
];
const rename = (_from: string, _to: string): void => undefined;
const move = (_name: string, _delta: -1 | 1): void => undefined;
const action = (_name: string): void => undefined;
</script>
<template>
  <DataTable
    v-model:density="density"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :class-names="names"
    :searchable="false"
    :url-sync="false"
    default-density="comfortable"
  />
  <SavedViewsPanel
    :views="views"
    :on-apply="action"
    :on-rename="rename"
    :on-move="move"
    :on-set-default="action"
    :on-remove="action"
    class-name="panel"
  />
</template>
