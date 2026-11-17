<script setup lang="ts">
/**
 * Mobile cards: the same table flipped between its desktop layout and phone
 * cards, both pagination styles, the built-in or a custom card, a bounded
 * list, the table's data states, and a host callback on activation.
 */
import { computed, shallowRef, type VNodeChild } from "vue";

import { pageDefaultsFor, pageLayoutFor, seedRoster } from "../../../casts";
import {
  forceMobileFor,
  MOBILE_BOUNDED_HEIGHT,
  MOBILE_CARDS,
  MOBILE_DATA_STATES,
  MOBILE_LAYOUTS,
  MOBILE_LOAD_ERROR,
  MOBILE_PAGING,
  MOBILE_START,
  MOBILE_TEXT,
  type MobileDataState,
  type MobileLayout,
  type MobilePaging,
  rowsFor,
} from "../../../shared/mobileScenario";
import {
  archivePeople,
  peopleBulkActions,
} from "../../../shared/peopleActions";
import { applyPersonRowEdit } from "../../../shared/peopleTable";
import {
  applyPersonEdit,
  currentDataLocale,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_DEFAULTS = pageDefaultsFor("mobile");
const PAGE_LAYOUT = pageLayoutFor("mobile");
const layout = shallowRef<MobileLayout>(MOBILE_START.layout);
const paging = shallowRef<MobilePaging>(MOBILE_START.paging);
const customCard = shallowRef(MOBILE_START.customCard);
const bounded = shallowRef(MOBILE_START.bounded);
const dataState = shallowRef<MobileDataState>(MOBILE_START.dataState);
const rows = shallowRef<readonly Person[]>(seedRoster("mobile", false));
const log = shallowRef<string>(MOBILE_TEXT.waiting);
const forceMobile = computed(() => forceMobileFor(layout.value));
const shownRows = computed(() => rowsFor(rows.value, dataState.value));
const FieldValue = (props: { value: VNodeChild }) => props.value;
const features = [
  kit.editing<Person>((row, key, value) => {
    rows.value = applyPersonEdit(rows.value, row, key, value);
  }),
  kit.rowEditing<Person>((row, patch) => {
    rows.value = applyPersonRowEdit(
      rows.value,
      row,
      patch,
      currentDataLocale()
    );
  }),
  // Selection and the shared bulk bar over it, as on every page that selects.
  kit.bulkActions(
    peopleBulkActions(currentDataLocale(), {
      onArchive: (ids) => {
        rows.value = archivePeople(rows.value, ids);
      },
    })
  ),
  ...pageChromeFeatures(kit, { editing: true, urlKey: "mob" }),
];
const columns = peopleColumns(kit, { editable: true });

/** The host callback when a card or row is activated. */
function activate(row: Person): void {
  log.value = MOBILE_TEXT.activated(row.name);
}
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <div class="seg" role="group" :aria-label="MOBILE_TEXT.layout">
        <button
          v-for="option in MOBILE_LAYOUTS"
          :key="option.value"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': layout === option.value }"
          :aria-pressed="layout === option.value"
          @click="layout = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="seg" role="group" :aria-label="MOBILE_TEXT.paging">
        <button
          v-for="option in MOBILE_PAGING"
          :key="option.value"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': paging === option.value }"
          :aria-pressed="paging === option.value"
          @click="paging = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="seg" role="group" :aria-label="MOBILE_TEXT.card">
        <button
          v-for="option in MOBILE_CARDS"
          :key="option.label"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': customCard === option.value }"
          :aria-pressed="customCard === option.value"
          @click="customCard = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <button
        type="button"
        class="seg__btn"
        :class="{ 'is-on': bounded }"
        :aria-pressed="bounded"
        @click="bounded = !bounded"
      >
        {{ MOBILE_TEXT.bounded }}
      </button>
      <div class="seg" role="group" :aria-label="MOBILE_TEXT.data">
        <button
          v-for="option in MOBILE_DATA_STATES"
          :key="option.value"
          type="button"
          class="seg__btn"
          :class="{ 'is-on': dataState === option.value }"
          :aria-pressed="dataState === option.value"
          @click="dataState = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <span class="hint">{{ MOBILE_TEXT.hint }}</span>
    </div>
    <div class="mx-demo__body">
      <div :class="{ 'phone-frame': forceMobile === true }">
        <component
          :is="kit.DataTable"
          v-bind="TABLE_PRESENTATION"
          table-label="People"
          :url-sync="false"
          :force-mobile="forceMobile"
          selectable
          searchable
          :features="features"
          :data="shownRows"
          :max-height="bounded ? MOBILE_BOUNDED_HEIGHT : undefined"
          :pagination-mode="paging"
          :is-loading="dataState === 'loading'"
          :error="dataState === 'error' ? MOBILE_LOAD_ERROR : null"
          :on-row-click="activate"
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
    </div>
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
  </div>
</template>
