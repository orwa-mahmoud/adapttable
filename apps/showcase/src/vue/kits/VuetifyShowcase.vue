<script setup lang="ts">
import { DataTable } from "@adapttable/vuetify";
import { densityChooser } from "@adapttable/vuetify/density";
import { fullscreen } from "@adapttable/vuetify/fullscreen";
import { VApp } from "vuetify/components/VApp";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <VApp
    ><KitShowcase name="Vuetify" kit="vuetify"
      ><template #default="{ tableProps, onSelectionChange }"
        ><DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="onSelectionChange" /></template></KitShowcase
  ></VApp>
</template>
