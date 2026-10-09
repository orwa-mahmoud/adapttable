<script setup lang="ts">
/** Timed row patches preserve the reader's view, matching RealtimeDemo.tsx. */
import { applyRowPatches, updateRow } from "@adapttable/core";
import { onScopeDispose, shallowRef } from "vue";

import { budget, formatMoney } from "../../../people";
import {
  peopleColumns,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const rows = shallowRef<readonly Person[]>(peopleRows());
const running = shallowRef(
  new URLSearchParams(window.location.search).get("live") !== "off"
);
const feed = shallowRef<readonly { id: number; text: string }[]>([]);
let sequence = 0;

/** Apply a core row patch, retaining the update journal and stable ids. */
function patch(): void {
  const row = rows.value[sequence % 10];
  if (!row) return;
  const nextBudget = budget(row) + 1000;
  rows.value = applyRowPatches(
    rows.value,
    [updateRow<Person>(row.id, { budget: nextBudget })],
    rowKey
  );
  feed.value = [
    {
      id: ++sequence,
      text: `${row.name}: ${formatMoney(budget(row))} → ${formatMoney(nextBudget)}`,
    },
    ...feed.value,
  ].slice(0, 6);
}

const timer = window.setInterval(() => {
  if (running.value) patch();
}, 2500);
onScopeDispose(() => window.clearInterval(timer));
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="running"
        @click="running = !running"
      >
        {{ running ? "Pause updates" : "Resume updates" }}
      </button>
      <button type="button" class="seg__btn" @click="patch">
        Apply next update
      </button>
      <span class="hint"
        >Sort or select a row; its identity survives each patch.</span
      >
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="Live people"
        :url-sync="false"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        selectable
        :defaults="{ limit: 10 }"
      />
    </div>
    <ol data-testid="patch-feed" aria-label="Live updates">
      <li v-for="entry in feed" :key="entry.id">{{ entry.text }}</li>
    </ol>
  </div>
</template>
