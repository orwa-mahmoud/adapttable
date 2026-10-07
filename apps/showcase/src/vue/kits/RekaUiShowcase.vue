<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";
import { densityChooser } from "@adapttable/reka-ui/density";
import { fullscreen } from "@adapttable/reka-ui/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Reka UI" kit="reka-ui"
    ><template #default="{ tableProps, onSelectionChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
