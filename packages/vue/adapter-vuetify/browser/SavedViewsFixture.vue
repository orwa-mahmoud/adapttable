<script setup lang="ts">
import {
  type SavedView,
  type SavedViewsStore,
  useSavedViews,
} from "@adapttable/vue";
import { ref } from "vue";

import { DataTable } from "../src";
import VuetifyButton from "../src/controls/VuetifyButton.vue";
import { savedViews, SavedViewsPanel } from "../src/saved-views";

const initial: readonly SavedView[] = [
  { name: "First", search: "q=Ada", isDefault: true },
  { name: "Second", search: "q=Grace" },
  { name: "Team", search: "", readOnly: true },
];
const writes = ref<string[]>([]);
function store(): SavedViewsStore {
  return {
    list: () => Promise.resolve(initial),
    save: (view) => {
      writes.value.push(`save:${view.name}`);
      return Promise.resolve();
    },
    remove: (name) => {
      writes.value.push(`remove:${name}`);
      return Promise.resolve();
    },
    reorder: (names) => {
      writes.value.push(`order:${names.join(",")}`);
      return Promise.resolve();
    },
  };
}
const features = [savedViews({ storageKey: "menu-browser", store: store() })];
const model = useSavedViews({
  storageKey: "panel-browser",
  store: store(),
  urlSync: false,
});
const people = [
  { id: "one", name: "Ada" },
  { id: "two", name: "Grace" },
];
const visible = ref(true);
const rtl = new URLSearchParams(location.search).has("rtl");
const mobile = new URLSearchParams(location.search).has("mobile");
</script>

<template>
  <main :dir="rtl ? 'rtl' : 'ltr'" style="padding: 24px">
    <VuetifyButton :attrs="{ id: 'outside' }" content="Outside target" />
    <VuetifyButton
      :attrs="{ id: 'toggle-table', onClick: () => (visible = !visible) }"
      content="Toggle table"
    />
    <KeepAlive>
      <DataTable
        v-if="visible"
        :data="people"
        :columns="[{ key: 'name', header: 'Name' }]"
        :row-key="(row) => row.id"
        :features="features"
        :url-sync="false"
        :force-mobile="mobile"
        :dir="rtl ? 'rtl' : 'ltr'"
      />
    </KeepAlive>
    <SavedViewsPanel
      :views="model.views.value"
      :on-apply="model.apply"
      :on-rename="model.rename"
      :on-move="model.move"
      :on-set-default="model.setDefault"
      :on-remove="model.remove"
    />
    <output id="writes">{{ writes.join(" | ") }}</output>
  </main>
</template>
