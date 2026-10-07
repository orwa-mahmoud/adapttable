<script setup lang="ts">
import { DataTable } from "@adapttable/shadcn-vue";
import { columnMenu } from "@adapttable/shadcn-vue/column-menu";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import { fullscreen } from "@adapttable/shadcn-vue/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="shadcn-vue" kit="shadcn-vue" columns-demo
    ><template
      #default="{ tableProps, onSelectionChange, onColumnLayoutChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:column-layout="onColumnLayoutChange"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
