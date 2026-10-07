<script setup lang="ts">
import { DataTable } from "@adapttable/shadcn-vue";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import { fullscreen } from "@adapttable/shadcn-vue/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="shadcn-vue" kit="shadcn-vue"
    ><template #default="{ tableProps, onSelectionChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
