<script setup lang="ts">
import { ref } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VCard } from "vuetify/components/VCard";
import { VMain } from "vuetify/components/VMain";

import VuetifyButton from "../src/controls/VuetifyButton.vue";
import VuetifyCheckbox from "../src/controls/VuetifyCheckbox.vue";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import VuetifySelect from "../src/controls/VuetifySelect.vue";

const search = ref("Ada");
const team = ref("platform");
const selected = ref(false);
const selectionRequests = ref(0);
const searchRequests = ref(0);
const decoration = ref(false);
const rejectChanges = ref(false);
const target = ref<HTMLElement | null>(null);
const options = [
  { value: "platform", label: "Platform" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
];
</script>

<template>
  <VApp>
    <VMain>
      <VCard class="fixture-card" :data-decoration="decoration" elevation="2">
        <h1>Vuetify controls</h1>
        <p>Native focus targets with Material Design presentation.</p>
        <label for="fixture-search">Search people</label>
        <VuetifyInput
          type="search"
          :attrs="{
            id: 'fixture-search',
            'aria-label': 'Search people',
            'data-adapttable-part': 'search-input',
          }"
          :value="search"
          :on-change="
            (value) => {
              searchRequests++;
              if (!rejectChanges) search = value;
            }
          "
        />
        <label for="fixture-team">Team</label>
        <VuetifySelect
          :attrs="{
            id: 'fixture-team',
            'aria-label': 'Team',
            'data-adapttable-part': 'filter-select',
            ref: (element: HTMLElement | null) => {
              target = element;
            },
          }"
          :value="team"
          :options="options"
          :on-change="
            (value) => {
              if (!rejectChanges) team = value;
            }
          "
        />
        <div class="fixture-selection">
          <VuetifyCheckbox
            :attrs="{
              id: 'fixture-selected',
              'aria-label': 'Select row',
              'data-adapttable-part': 'selection-checkbox',
            }"
            :checked="selected"
            :on-change="
              (value) => {
                selectionRequests++;
                if (!rejectChanges) selected = value;
              }
            "
          />
          <label for="fixture-selected">Select row</label>
        </div>
        <div class="fixture-buttons">
          <VuetifyButton
            :attrs="{ onClick: () => (decoration = !decoration) }"
            content="Update decoration"
          />
          <VuetifyButton
            :attrs="{ onClick: () => target?.focus() }"
            content="Focus team"
          />
          <VuetifyButton
            :attrs="{
              'aria-pressed': rejectChanges,
              onClick: () => {
                rejectChanges = !rejectChanges;
              },
            }"
            content="Reject changes"
          />
        </div>
        <output aria-label="Selected team">{{ team }}</output>
        <output aria-label="Selection requests">{{ selectionRequests }}</output>
        <output aria-label="Search requests">{{ searchRequests }}</output>
        <output aria-label="Search value">{{ search }}</output>
      </VCard>
    </VMain>
  </VApp>
</template>

<style scoped>
.fixture-card {
  max-inline-size: 540px;
  margin: 48px auto;
  padding: 28px;
  display: grid;
  gap: 16px;
}
.fixture-card h1 {
  font-size: 24px;
}
.fixture-selection,
.fixture-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}
@media (max-width: 600px) {
  .fixture-card {
    margin: 16px;
  }
  .fixture-buttons {
    flex-wrap: wrap;
  }
}
</style>
