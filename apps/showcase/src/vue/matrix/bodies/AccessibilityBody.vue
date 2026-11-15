<script setup lang="ts">
/** Keyboard focus and a real live-region transcript, from AccessibilityDemo.tsx. */
import { onMounted, onScopeDispose, shallowRef, useTemplateRef } from "vue";

import { pageDefaultsFor, pageLayoutFor, rosterFor } from "../../../casts";
import {
  ACCESSIBILITY_HINTS,
  readAnnouncements,
  TRANSCRIPT_LENGTH,
  TRANSCRIPT_TEXT,
} from "../../../shared/pageHints";
import { peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const ROWS = rosterFor("accessibility");
const PAGE_DEFAULTS = pageDefaultsFor("accessibility");
const PAGE_LAYOUT = pageLayoutFor("accessibility");
const columns = peopleColumns(kit);
const pageFeatures = [kit.cellNavigation(), kit.columnSelectionCheckbox()];
const chrome = pageChromeFeatures(kit, { urlKey: "a11y" });
const features = [...pageFeatures, ...chrome];
const tableRoot = useTemplateRef<HTMLElement>("tableRoot");
const announcements = shallowRef<readonly string[]>([]);
let observer: MutationObserver | undefined;

onMounted(() => {
  const root = tableRoot.value;
  if (!root) return;
  let last = "";
  const read = (): void => {
    const next = readAnnouncements(root, last);
    last = next.last;
    if (next.lines.length === 0) return;
    announcements.value = [...next.lines, ...announcements.value].slice(
      0,
      TRANSCRIPT_LENGTH
    );
  };
  observer = new MutationObserver(read);
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  read();
});
onScopeDispose(() => observer?.disconnect());
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span v-for="hint in ACCESSIBILITY_HINTS" :key="hint" class="hint">{{
        hint
      }}</span>
    </div>
    <div ref="tableRoot" class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People keyboard grid"
        :url-sync="false"
        :data="ROWS"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        selectable
        :features="features"
        :defaults="PAGE_DEFAULTS"
      />
    </div>
    <div class="mx-demo__body" data-testid="announcements">
      <strong>{{ TRANSCRIPT_TEXT.title }}</strong>
      <p v-if="announcements.length === 0">{{ TRANSCRIPT_TEXT.empty }}</p>
      <ol v-else>
        <li v-for="(line, index) in announcements" :key="index">{{ line }}</li>
      </ol>
    </div>
  </div>
</template>
