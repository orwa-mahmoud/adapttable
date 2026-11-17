<script setup lang="ts">
/**
 * Realtime: rows change under the reader while they work. Patches arrive
 * through the binding's patch stream, land where the reader is looking
 * under the live Budget sort, and the feed names each one.
 */
import {
  applyRowPatchesWithLog,
  type RowPatchEvent,
  rowPatchLog,
} from "@adapttable/core";
import { useChangedCellFlash, useRowPatchStream } from "@adapttable/vue/stream";
import { shallowRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import {
  createDemoPatchSource,
  nextRealtimePatch,
  PATCH_STREAM_URL,
  personCellFlashing,
  REALTIME_FEED_LENGTH,
  REALTIME_HINTS,
  REALTIME_TEXT,
  realtimeStartsLive,
  streamStatusLabel,
} from "../../../shared/realtimeScenario";
import {
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("realtime");
const PAGE_LAYOUT = pageLayoutFor("realtime");
const features = pageChromeFeatures(kit, { urlKey: "rt" });
const columns = peopleColumns(kit);
// The direction the table sorts in now: a patch lands where the reader is
// looking, whichever way they have turned the sort.
let sortDir: "asc" | "desc" = "desc";

/** Keep the patcher's direction the table's own. */
function followSort(query: { readonly sortDir?: string }): void {
  sortDir = query.sortDir === "asc" ? "asc" : "desc";
}
const rows = shallowRef<readonly Person[]>(rosterFor("realtime"));
const running = shallowRef(realtimeStartsLive());
const feed = shallowRef<readonly string[]>([]);
const flash = useChangedCellFlash({ enabled: true });
const isCellFlashing = personCellFlashing(flash.isFlashing);
let tick = 0;
let pending: string | undefined;
let pendingEvents: readonly RowPatchEvent<Person>[] | undefined;

/** Record what was applied: the feed's newest line and the cells to flash. */
function landed(line: string, events: readonly RowPatchEvent<Person>[]): void {
  feed.value = [line, ...feed.value].slice(0, REALTIME_FEED_LENGTH);
  flash.mark(events);
}

const stream = useRowPatchStream<Person>(() => ({
  eventSource: running.value ? PATCH_STREAM_URL : undefined,
  enabled: running.value,
  getRowId: rowKey,
  createEventSource: createDemoPatchSource,
  onPatch: (update) => {
    const next = update(rows.value);
    pendingEvents = rowPatchLog(next)?.events;
    rows.value = next;
  },
  parse: () => {
    const next = nextRealtimePatch(rows.value, tick, sortDir);
    if (!next) return [];
    tick += 1;
    pending = next.line;
    return [next.patch];
  },
  onPatches: () => {
    if (pending === undefined) return;
    landed(pending, pendingEvents ?? []);
    pending = undefined;
    pendingEvents = undefined;
  },
}));

/** The same update the stream applies, applied once by hand. */
function applyNext(): void {
  const next = nextRealtimePatch(rows.value, tick, sortDir);
  if (!next) return;
  tick += 1;
  const log = applyRowPatchesWithLog(rows.value, [next.patch], rowKey);
  rows.value = log.rows;
  landed(next.line, log.events);
}
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in REALTIME_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="Live people"
        :url-sync="false"
        mode="frontend"
        :on-query-change="followSort"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :features="features"
        :is-cell-flashing="isCellFlashing"
        density="compact"
        selectable
        :defaults="PAGE_DEFAULTS"
      />
    </div>
    <div
      class="demo-live-update demo-live-update--feed"
      data-testid="realtime-feed"
      :data-stream-status="stream.status.value"
    >
      <span>{{ REALTIME_TEXT.feed }}</span>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="running"
        @click="running = !running"
      >
        {{ running ? REALTIME_TEXT.pause : REALTIME_TEXT.resume }}
      </button>
      <button type="button" class="seg__btn" @click="applyNext">
        {{ REALTIME_TEXT.applyNext }}
      </button>
      <span class="visually-hidden" aria-live="polite">{{
        streamStatusLabel(stream.status.value)
      }}</span>
      <span class="visually-hidden" aria-live="polite">{{
        feed[0] ?? ""
      }}</span>
      <span v-if="feed.length === 0">{{ REALTIME_TEXT.waiting }}</span>
      <ol v-else>
        <li v-for="(line, index) in feed" :key="`${line}-${index}`">
          {{ line }}
        </li>
      </ol>
    </div>
  </div>
</template>
