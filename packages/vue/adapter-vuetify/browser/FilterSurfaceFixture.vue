<script setup lang="ts">
import { h, ref, shallowRef } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VMain } from "vuetify/components/VMain";

import VuetifyButton from "../src/controls/VuetifyButton.vue";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import VuetifySelect from "../src/controls/VuetifySelect.vue";
import VuetifyFilterDrawer from "../src/filters/VuetifyFilterDrawer.vue";
import VuetifyFilterPopover from "../src/filters/VuetifyFilterPopover.vue";

const modal = location.pathname === "/filter-surface-drawer";
const open = ref(false);
const visible = ref(true);
const mounted = ref(true);
const reject = ref(location.search.includes("reject"));
const requests = ref(0);
const anchor = shallowRef<HTMLElement | null>(null);
const draft = ref("");
const selected = ref("a");
const setAnchor = (element: HTMLElement | null) => {
  anchor.value = element;
};
function close() {
  requests.value++;
  if (!reject.value) open.value = false;
}
const Content = () =>
  h("div", { class: "surface-controls" }, [
    h(VuetifyInput, {
      attrs: { "aria-label": "Filter people" },
      value: draft.value,
      onChange: (value) => {
        draft.value = value;
      },
    }),
    h(VuetifySelect, {
      attrs: { "aria-label": "Team" },
      value: selected.value,
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      onChange: (value) => {
        selected.value = value;
      },
    }),
    h(VuetifyButton, {
      attrs: {
        onClick: () => {
          reject.value = false;
        },
      },
      content: "Accept dismissals",
    }),
    h(VuetifyButton, {
      attrs: {
        onClick: () => {
          visible.value = false;
        },
      },
      content: "Hide surface",
    }),
    h(VuetifyButton, {
      attrs: {
        onClick: () => {
          mounted.value = false;
        },
      },
      content: "Dispose surface",
    }),
  ]);
</script>

<template>
  <VApp>
    <VMain style="padding: 40px">
      <h1>Controlled filter surface</h1>
      <VuetifyButton
        :attrs="{ ref: setAnchor, onClick: () => (open = true) }"
        content="Open filters"
      />
      <VuetifyButton :attrs="{}" content="Outside control" />
      <VuetifyButton
        :attrs="{ onClick: () => (visible = true) }"
        content="Show surface"
      />
      <output aria-label="Dismissal requests">{{ requests }}</output>
      <KeepAlive v-if="mounted">
        <component
          :is="modal ? VuetifyFilterDrawer : VuetifyFilterPopover"
          v-if="visible"
          :open="open"
          :anchor="anchor"
          label="People filters"
          dir="ltr"
          :children="h(Content)"
          :on-close="close"
        />
      </KeepAlive>
    </VMain>
  </VApp>
</template>

<style scoped>
.surface-controls {
  display: grid;
  gap: 1rem;
}
</style>
