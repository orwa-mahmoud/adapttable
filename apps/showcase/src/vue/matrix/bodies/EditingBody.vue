<script setup lang="ts">
/** Editing: kit-native editors in the cell; the host writes every change. */
import { computed, shallowRef } from "vue";

import { pageDefaultsFor, seedRoster } from "../../../casts";
import {
  EDITING_DEFAULT_LAYOUT,
  liveNameUpdate,
} from "../../../shared/peopleTable";
import {
  applyPersonEdit,
  peopleColumns,
  type Person,
  personDisplayName,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("editing");
const columns = peopleColumns(kit, { editable: true });
const rows = shallowRef<readonly Person[]>(seedRoster("editing", false));
const log = shallowRef("Every change goes through the host.");
const rejectNext = shallowRef(false);
const editingEnabled = shallowRef(true);

/** Patch the same localized name field an editor reads while its draft stays open. */
function receiveLiveUpdate(): void {
  const row = rows.value[0];
  if (!row) return;
  const name = liveNameUpdate(row);
  rows.value = applyPersonEdit(rows.value, row, "person", name);
  log.value = `Received live name update: ${name}`;
}

const editingFeature = kit.editing<Person>(
  (row, key, value) => {
    rows.value = applyPersonEdit(rows.value, row, key, value);
    if (rejectNext.value) {
      rejectNext.value = false;
      log.value = `Save rejected for ${personDisplayName(row)}; undo the optimistic change.`;
      return Promise.reject(new Error("The demo server rejected this change"));
    }
    log.value = `Saved ${key} for ${personDisplayName(row)}: ${String(value)}`;
    return undefined;
  },
  {
    editConflictPolicy: "ask",
    formatEditError: (error: unknown) =>
      error instanceof Error ? error.message : "The demo save failed",
    onEditRollback: (previous: Person) => {
      rows.value = rows.value.map((row) =>
        row.id === previous.id ? previous : row
      );
      log.value = `Restored ${personDisplayName(previous)} after the rejected save.`;
    },
  }
);
const persistentFeatures = [
  kit.editHistory(),
  kit.undoRedoButtons(),
  kit.cellNavigation(),
  kit.columnSelectionCheckbox(),
];
const pageFeatures = computed(() => [
  ...(editingEnabled.value ? [editingFeature] : []),
  ...persistentFeatures,
]);
const chrome = pageChromeFeatures(kit, { editing: true, urlKey: "edit" });
const features = computed(() => [
  kit.selection(),
  ...pageFeatures.value,
  ...chrome,
]);
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="editingEnabled"
        @mousedown.prevent
        @click="editingEnabled = !editingEnabled"
      >
        Allow editing
      </button>
      <span class="hint">Double-click a cell to edit it</span>
      <span class="hint">Enter commits, Escape cancels</span>
      <button
        type="button"
        class="seg__btn"
        @mousedown.prevent
        @click="receiveLiveUpdate"
      >
        Receive live name update
      </button>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="rejectNext"
        @click="rejectNext = !rejectNext"
      >
        Reject next save
      </button>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :defaults="PAGE_DEFAULTS"
        :default-column-layout="EDITING_DEFAULT_LAYOUT"
        :features="features"
      />
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
