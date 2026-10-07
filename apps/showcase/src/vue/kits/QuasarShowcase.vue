<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
import { densityChooser } from "@adapttable/quasar/density";
import { fullscreen } from "@adapttable/quasar/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Quasar" kit="quasar"
    ><template #default="{ tableProps, onSelectionChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
