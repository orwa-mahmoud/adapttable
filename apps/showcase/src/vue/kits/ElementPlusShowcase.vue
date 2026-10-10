<script setup lang="ts">
import { DataTable } from "@adapttable/element-plus";
import { columnMenu } from "@adapttable/element-plus/column-menu";
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";
import { ElButton, ElConfigProvider, ElTag } from "element-plus";
import ar from "element-plus/es/locale/lang/ar.mjs";
import en from "element-plus/es/locale/lang/en.mjs";
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
  return h(
    ElTag,
    {
      type: statusType[row.status],
      size: "small",
      effect: "light",
      "data-order-status": row.status,
    },
    () => label
  );
}
</script>

<template>
  <KitShowcase
    name="Element Plus"
    kit="element-plus"
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
          <ElButton
            v-for="option in control.options"
            :key="option.value"
            :type="control.value === option.value ? 'primary' : undefined"
            native-type="button"
            size="small"
            v-bind="{
              'aria-pressed': control.value === option.value,
              lang: control.key === 'lang' ? option.value : undefined,
              onClick: () => onChange(control.key, option.value),
            }"
            >{{ option.label }}</ElButton
          >
        </div>
      </div>
    </template>
    <template
      #default="{ tableProps, onSelectionChange, onColumnLayoutChange, locale }"
    >
      <ElConfigProvider :locale="locale === 'ar' ? ar : en">
        <DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="onSelectionChange"
          @update:column-layout="onColumnLayoutChange"
        />
      </ElConfigProvider>
    </template>
  </KitShowcase>
</template>
