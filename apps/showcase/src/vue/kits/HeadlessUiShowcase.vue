<script setup lang="ts">
import { DataTable } from "@adapttable/vue-headless-ui";
import { columnMenu } from "@adapttable/vue-headless-ui/column-menu";
import { densityChooser } from "@adapttable/vue-headless-ui/density";
import { fullscreen } from "@adapttable/vue-headless-ui/fullscreen";
import { selection } from "@adapttable/vue-headless-ui/selection";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
function renderStatus(row: Order, label: string) {
  return h(
    "span",
    { class: "vue-kit-preview__status", "data-order-status": row.status },
    label
  );
}
</script>

<template>
  <KitShowcase
    name="Headless UI"
    kit="headless-ui"
    :render-status="renderStatus"
    columns-demo
  >
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
          <button
            v-for="option in control.options"
            :key="option.value"
            type="button"
            class="vue-kit-preview__headless-choice"
            :aria-pressed="control.value === option.value"
            :lang="control.key === 'lang' ? option.value : undefined"
            @click="onChange(control.key, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </template>
    <template
      #default="{
        tableProps,
        selectedIds,
        onSelectionChange,
        onColumnLayoutChange,
      }"
    >
      <DataTable
        v-bind="tableProps"
        :features="[selection({ selectedIds, onSelectionChange }), ...features]"
        @update:column-layout="onColumnLayoutChange"
      />
    </template>
  </KitShowcase>
</template>
