<script setup lang="ts">
import { DataTable } from "@adapttable/element-plus";
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Element Plus" kit="element-plus"
    ><template #default="{ tableProps, onSelectionChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
