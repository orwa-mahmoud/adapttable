<script setup lang="ts">
import { DataTable } from "@adapttable/nuxt-ui";
import { columnMenu } from "@adapttable/nuxt-ui/column-menu";
import { densityChooser } from "@adapttable/nuxt-ui/density";
import { fullscreen } from "@adapttable/nuxt-ui/fullscreen";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
const statusType = {
  Review: "warning",
  Ready: "success",
  Dispatched: "info",
} as const;
function renderStatus(row: Order, label: string) {
  return h(UBadge, {
    color: statusType[row.status],
    size: "sm",
    variant: "subtle",
    label,
    "data-order-status": row.status,
  });
}
</script>

<template>
  <KitShowcase
    name="Nuxt UI"
    kit="nuxt-ui"
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
          <UButton
            v-for="option in control.options"
            :key="option.value"
            color="neutral"
            :variant="control.value === option.value ? 'solid' : 'outline'"
            size="sm"
            :aria-pressed="control.value === option.value"
            :lang="control.key === 'lang' ? option.value : undefined"
            @click="onChange(control.key, option.value)"
            >{{ option.label }}</UButton
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
</template>
