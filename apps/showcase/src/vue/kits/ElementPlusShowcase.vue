<script setup lang="ts">
import { DataTable } from "@adapttable/element-plus";
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";
import { ElConfigProvider } from "element-plus";
import ar from "element-plus/es/locale/lang/ar.mjs";
import en from "element-plus/es/locale/lang/en.mjs";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Element Plus" kit="element-plus"
    ><template #default="{ tableProps, onSelectionChange, locale }"
      ><ElConfigProvider :locale="locale === 'ar' ? ar : en"
        ><DataTable
          v-bind="tableProps"
          :features="features"
          @update:selected-ids="
            onSelectionChange
          " /></ElConfigProvider></template
  ></KitShowcase>
</template>
