<script setup lang="ts">
import { DataTable } from "@adapttable/nuxt-ui";
import { densityChooser } from "@adapttable/nuxt-ui/density";
import { fullscreen } from "@adapttable/nuxt-ui/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Nuxt UI" kit="nuxt-ui"
    ><template #default="{ tableProps, onSelectionChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
