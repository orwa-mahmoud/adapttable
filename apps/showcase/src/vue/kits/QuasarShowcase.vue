<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
import { densityChooser } from "@adapttable/quasar/density";
import { fullscreen } from "@adapttable/quasar/fullscreen";
import { QBadge, QBtn } from "quasar";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
const statusType = {
  Review: "amber-9",
  Ready: "positive",
  Dispatched: "primary",
} as const;
function renderStatus(row: Order, label: string) {
  return h(QBadge, {
    color: statusType[row.status],
    textColor: "white",
    rounded: true,
    label,
    "data-order-status": row.status,
  });
}
</script>

<template>
  <KitShowcase name="Quasar" kit="quasar" :render-status="renderStatus">
    <template #presentation="{ controls, onChange }">
      <div
        v-for="control in controls"
        :key="control.key"
        class="vue-kit-preview__control"
      >
        <span class="vue-kit-preview__control-label">{{ control.label }}</span>
        <div
          class="vue-kit-preview__choices"
          role="group"
          :aria-label="control.label"
        >
          <QBtn
            v-for="option in control.options"
            :key="option.value"
            :outline="control.value !== option.value"
            :color="control.value === option.value ? 'primary' : undefined"
            size="sm"
            no-caps
            unelevated
            :aria-pressed="control.value === option.value"
            :lang="control.key === 'lang' ? option.value : undefined"
            @click="onChange(control.key, option.value)"
            >{{ option.label }}</QBtn
          >
        </div>
      </div>
    </template>
    <template #default="{ tableProps, onSelectionChange }">
      <DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange"
      />
    </template>
  </KitShowcase>
</template>
