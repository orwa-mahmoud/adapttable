<script setup lang="ts">
import { DataTable } from "@adapttable/vuetify";
import { columnMenu } from "@adapttable/vuetify/column-menu";
import { densityChooser } from "@adapttable/vuetify/density";
import { fullscreen } from "@adapttable/vuetify/fullscreen";
import { h } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VBtn } from "vuetify/components/VBtn";
import { VChip } from "vuetify/components/VChip";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
const statusType = {
  Review: "warning",
  Ready: "success",
  Dispatched: "info",
} as const;
function renderStatus(row: Order, label: string) {
  return h(
    VChip,
    {
      color: statusType[row.status],
      size: "small",
      variant: "tonal",
      "data-order-status": row.status,
    },
    () => label
  );
}
</script>

<template>
  <VApp>
    <KitShowcase
      name="Vuetify"
      kit="vuetify"
      :render-status="renderStatus"
      columns-demo
    >
      <template #presentation="{ controls, onChange }">
        <div
          v-for="control in controls"
          :key="control.key"
          class="vue-kit-preview__control"
        >
          <span class="vue-kit-preview__control-label">{{
            control.label
          }}</span>
          <div
            class="vue-kit-preview__choices"
            role="group"
            :aria-label="control.label"
          >
            <VBtn
              v-for="option in control.options"
              :key="option.value"
              :variant="control.value === option.value ? 'flat' : 'outlined'"
              :color="control.value === option.value ? 'primary' : undefined"
              size="small"
              :aria-pressed="control.value === option.value"
              :lang="control.key === 'lang' ? option.value : undefined"
              @click="onChange(control.key, option.value)"
              >{{ option.label }}</VBtn
            >
          </div>
        </div>
      </template>
      <template
        #default="{ tableProps, onSelectionChange, onColumnLayoutChange }"
      >
        <DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="onSelectionChange"
          @update:column-layout="onColumnLayoutChange"
        />
      </template>
    </KitShowcase>
  </VApp>
</template>
