<script setup lang="ts">
import { DataTable } from "@adapttable/ant-design-vue";
import { columnMenu } from "@adapttable/ant-design-vue/column-menu";
import { densityChooser } from "@adapttable/ant-design-vue/density";
import { fullscreen } from "@adapttable/ant-design-vue/fullscreen";
import { selection } from "@adapttable/ant-design-vue/selection";
import { Button, ConfigProvider, Tag, theme } from "ant-design-vue";
import arEG from "ant-design-vue/es/locale/ar_EG";
import enUS from "ant-design-vue/es/locale/en_US";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
const statusColor = {
  Review: "warning",
  Ready: "success",
  Dispatched: "processing",
} as const;
function renderStatus(row: Order, label: string) {
  return h(
    Tag,
    { color: statusColor[row.status], "data-order-status": row.status },
    () => label
  );
}
</script>

<template>
  <KitShowcase
    name="Ant Design Vue"
    kit="ant-design-vue"
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
          <Button
            v-for="option in control.options"
            :key="option.value"
            :type="control.value === option.value ? 'primary' : 'default'"
            html-type="button"
            size="small"
            v-bind="{
              'aria-pressed': control.value === option.value,
              lang: control.key === 'lang' ? option.value : undefined,
              onClick: () => onChange(control.key, option.value),
            }"
            >{{ option.label }}</Button
          >
        </div>
      </div>
    </template>
    <template
      #default="{
        tableProps,
        selectedIds,
        onSelectionChange,
        onColumnLayoutChange,
        dark,
        locale,
      }"
    >
      <ConfigProvider
        :locale="locale === 'ar' ? arEG : enUS"
        :direction="locale === 'ar' ? 'rtl' : 'ltr'"
        :theme="{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }"
      >
        <DataTable
          v-bind="tableProps"
          :features="[
            selection({ selectedIds, onSelectionChange }),
            ...features,
          ]"
          @update:column-layout="onColumnLayoutChange"
        />
      </ConfigProvider>
    </template>
  </KitShowcase>
</template>
