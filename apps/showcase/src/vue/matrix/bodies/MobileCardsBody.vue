<script setup lang="ts">
/** Mobile cards: the same table, every row a card, in a phone-width frame. */
import { computed, h, ref, shallowRef, type VNodeChild } from "vue";

import { pageDefaultsFor, pageLayoutFor } from "../../../casts";
import {
  applyPersonEdit,
  demoOrders,
  FILTER_DEFS,
  type PEOPLE,
  peopleColumns,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("mobile");
const PAGE_LAYOUT = pageLayoutFor("mobile");
const mobile = ref<boolean | undefined>(true);
const rows = shallowRef<readonly Person[]>(peopleRows());
const customCard = ref(false);
const bounded = ref(false);
const paged = ref(true);
const scenario = ref("ready");
const displayedRows = computed(() =>
  scenario.value === "empty" || scenario.value === "loading" ? [] : rows.value
);
const demoError = computed(() =>
  scenario.value === "error"
    ? new Error("The directory could not be loaded. Try again.")
    : null
);
const FieldValue = (props: { value: VNodeChild }) => props.value;
const log = ref("Choose a person to see the host callback.");
const pageFeatures = [
  kit.rowEditing<Person>((row, patch) => {
    for (const [key, value] of Object.entries(patch))
      rows.value = applyPersonEdit(rows.value, row, key, value);
    log.value = `Saved ${row.name}`;
  }),
  kit.filters(FILTER_DEFS),
  kit.nestedTable<Person>((row) => ({
    label: `Orders for ${row.name}`,
    table: (defaults) =>
      h(kit.DataTable, {
        ...TABLE_PRESENTATION,
        ...defaults,
        data: demoOrders(row),
        columns: [
          {
            key: "item",
            header: "Item",
            accessor: (order: { item: string }) => order.item,
          },
        ],
        rowKey: (order: { id: string }) => order.id,
      }),
  })),
  kit.rowActions([
    {
      key: "profile",
      label: "View profile",
      onClick: (row: (typeof PEOPLE)[number]) => {
        log.value = `Opened ${row.name}`;
      },
    },
  ]),
];
const chrome = pageChromeFeatures(kit, { editing: true, urlKey: "mob" });
const features = [...pageFeatures, ...chrome];
const columns = peopleColumns({
  editable: true,
  status: kit.status,
  avatar: kit.avatar,
  progress: kit.progress,
});
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row" role="group" aria-label="Layout">
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="mobile === undefined"
        @click="mobile = undefined"
      >
        Automatic
      </button>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="mobile === true"
        @click="mobile = true"
      >
        Phone cards
      </button>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="mobile === false"
        @click="mobile = false"
      >
        Scrollable table
      </button>
    </div>
    <div class="hint-row" role="group" aria-label="Card options">
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="customCard"
        @click="customCard = !customCard"
      >
        Custom card
      </button>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="bounded"
        @click="bounded = !bounded"
      >
        Bounded scrolling
      </button>
      <button
        type="button"
        class="seg__btn"
        :aria-pressed="paged"
        @click="paged = !paged"
      >
        {{ paged ? "Paged" : "Infinite scroll" }}
      </button>
      <button
        v-for="state in ['ready', 'empty', 'loading', 'error']"
        :key="state"
        type="button"
        class="seg__btn"
        :aria-pressed="scenario === state"
        @click="scenario = state"
      >
        {{ state }}
      </button>
    </div>
    <div class="mx-demo__body" :class="{ 'mx-phone': mobile === true }">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        :url-sync="false"
        :force-mobile="mobile"
        selectable
        searchable
        :features="features"
        :data="displayedRows"
        :max-height="bounded ? 360 : undefined"
        :pagination-mode="paged ? 'paged' : 'infinite'"
        :is-loading="scenario === 'loading'"
        :error="demoError"
        :columns="columns"
        :row-key="rowKey"
        :default-column-layout="PAGE_LAYOUT"
        :defaults="PAGE_DEFAULTS"
      >
        <template v-if="customCard" #card="{ fields }">
          <div class="mx-custom-card" data-demo-custom-card>
            <div
              v-for="field in fields"
              :key="field.column.key"
              :class="{ 'mx-custom-card__identity': !field.label }"
            >
              <span v-if="field.label" class="mx-custom-card__label">{{
                field.label
              }}</span>
              <FieldValue :value="field.value" />
            </div>
          </div>
        </template>
      </component>
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
