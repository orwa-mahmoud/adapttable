<script setup lang="ts">
import { useSavedViews } from "@adapttable/vue";
import { shallowRef } from "vue";

import { DataTable } from "../../src";
import {
  type SavedView,
  savedViews,
  SavedViewsPanel,
  type SavedViewsPanelProps,
  type SavedViewsStore,
  type UseSavedViewsOptions,
} from "../../src/saved-views";

interface Person {
  id: string;
}
const entries: readonly SavedView[] = [{ name: "All", search: "" }];
const store: SavedViewsStore = {
  list: () => Promise.resolve(entries),
  save: (_view) => Promise.resolve(),
  remove: (_name) => Promise.resolve(),
};
const options = shallowRef<UseSavedViewsOptions>({
  storageKey: "people",
  store,
});
const features = [savedViews(options), savedViews(() => options.value)];
const model = useSavedViews(options);
const panel: SavedViewsPanelProps = {
  views: model.views.value,
  onApply: model.apply,
  onRename: model.rename,
  onMove: model.move,
  onSetDefault: model.setDefault,
  onRemove: model.remove,
};
const people: readonly Person[] = [{ id: "one" }];
</script>

<template>
  <SavedViewsPanel
    v-bind="panel"
    :class-names="{ viewsInput: 'rename-input' }"
  />
  <DataTable
    :data="people"
    :columns="[{ key: 'id', header: 'ID' }]"
    :row-key="(row) => row.id"
    :features="features.slice(0, 1)"
  />
</template>
