<script setup lang="ts">
/** Keyboard focus and a real live-region transcript, from AccessibilityDemo.tsx. */
import { onMounted, onScopeDispose, shallowRef, useTemplateRef } from "vue";

import { PEOPLE, peopleColumns, rowKey, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const features = [kit.cellNavigation(), kit.columnSelectionCheckbox()];
const tableRoot = useTemplateRef<HTMLElement>("tableRoot");
const announcements = shallowRef<readonly string[]>([]);
let observer: MutationObserver | undefined;

onMounted(() => {
  const root = tableRoot.value;
  if (!root) return;
  const previous = new WeakMap<Element, string>();
  const read = (): void => {
    for (const region of root.querySelectorAll(
      '[aria-live], [role="status"], [role="alert"]'
    )) {
      const text = region.textContent?.trim() ?? "";
      if (text === previous.get(region)) continue;
      previous.set(region, text);
      if (text)
        announcements.value = [text, ...announcements.value].slice(0, 6);
    }
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
    <p class="hint">
      Tab into the grid, then use arrows, Home and End. A checkbox selects a
      whole column.
    </p>
    <div ref="tableRoot" class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People keyboard grid"
        :url-sync="false"
        :data="PEOPLE"
        :columns="columns"
        :row-key="rowKey"
        :features="features"
        :defaults="{ limit: 10 }"
      />
    </div>
    <div class="mx-demo__body" data-testid="announcements">
      <strong>Announced to a screen reader</strong>
      <p v-if="announcements.length === 0">
        Move through the grid to hear its position and column.
      </p>
      <ol v-else>
        <li v-for="(line, index) in announcements" :key="index">{{ line }}</li>
      </ol>
    </div>
  </div>
</template>
