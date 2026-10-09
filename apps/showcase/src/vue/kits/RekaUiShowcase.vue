<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";
import { columnMenu } from "@adapttable/reka-ui/column-menu";
import { densityChooser } from "@adapttable/reka-ui/density";
import { fullscreen } from "@adapttable/reka-ui/fullscreen";
import { Primitive } from "reka-ui";
import { h } from "vue";

import type { Order } from "../workspace/data";
import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
function renderStatus(row: Order, label: string) {
  return h(
    Primitive,
    {
      as: "span",
      class: "vue-kit-preview__status",
      "data-order-status": row.status,
    },
    () => label
  );
}
</script>

<template>
  <KitShowcase
    name="Reka UI"
    kit="reka-ui"
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
          <Primitive
            v-for="option in control.options"
            :key="option.value"
            as="button"
            class="vue-kit-preview__reka-choice"
            v-bind="{
              type: 'button',
              'aria-pressed': control.value === option.value,
              lang: control.key === 'lang' ? option.value : undefined,
              onClick: () => onChange(control.key, option.value),
            }"
            >{{ option.label }}</Primitive
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
