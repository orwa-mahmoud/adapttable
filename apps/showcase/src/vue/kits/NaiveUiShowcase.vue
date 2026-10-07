<script setup lang="ts">
import { DataTable } from "@adapttable/naive-ui";
import { densityChooser } from "@adapttable/naive-ui/density";
import { fullscreen } from "@adapttable/naive-ui/fullscreen";
import { darkTheme, NConfigProvider } from "naive-ui";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Naive UI" kit="naive-ui"
    ><template #default="{ tableProps, onSelectionChange, dark }"
      ><NConfigProvider :theme="dark ? darkTheme : null"
        ><DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="
            onSelectionChange
          " /></NConfigProvider></template
  ></KitShowcase>
</template>
