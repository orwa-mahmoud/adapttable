<script setup lang="ts">
import { DataTable } from "@adapttable/naive-ui";
import { densityChooser } from "@adapttable/naive-ui/density";
import { fullscreen } from "@adapttable/naive-ui/fullscreen";
import {
  arDZ,
  darkTheme,
  enUS,
  NButton,
  NConfigProvider,
  NTag,
} from "naive-ui";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
const statusType = {
  Review: "warning",
  Ready: "success",
  Dispatched: "info",
} as const;
function renderStatus(row: Order, label: string) {
  return h(
    NTag,
    {
      type: statusType[row.status],
      size: "small",
      round: true,
      bordered: false,
      "data-order-status": row.status,
    },
    () => label
  );
}
</script>

<template>
  <KitShowcase name="Naive UI" kit="naive-ui" :render-status="renderStatus">
    <template #presentation="{ controls, onChange, dark, locale }">
      <NConfigProvider
        :theme="dark ? darkTheme : null"
        :locale="locale === 'ar' ? arDZ : enUS"
      >
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
            <NButton
              v-for="option in control.options"
              :key="option.value"
              :type="control.value === option.value ? 'primary' : 'default'"
              attr-type="button"
              size="small"
              v-bind="{
                'aria-pressed': control.value === option.value,
                lang: control.key === 'lang' ? option.value : undefined,
                onClick: () => onChange(control.key, option.value),
              }"
              >{{ option.label }}</NButton
            >
          </div>
        </div>
      </NConfigProvider>
    </template>
    <template #default="{ tableProps, onSelectionChange, dark, locale }">
      <NConfigProvider
        :theme="dark ? darkTheme : null"
        :locale="locale === 'ar' ? arDZ : enUS"
      >
        <DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="onSelectionChange"
        />
      </NConfigProvider>
    </template>
  </KitShowcase>
</template>
