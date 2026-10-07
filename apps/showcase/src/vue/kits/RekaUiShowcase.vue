<script setup lang="ts">
import { DataTable } from "@adapttable/reka-ui";
import { columnMenu } from "@adapttable/reka-ui/column-menu";
import { densityChooser } from "@adapttable/reka-ui/density";
import { fullscreen } from "@adapttable/reka-ui/fullscreen";

import KitShowcase from "./KitShowcase.vue";
const features = [columnMenu(), densityChooser(), fullscreen()];
</script>

<template>
  <KitShowcase name="Reka UI" kit="reka-ui" columns-demo
    ><template
      #default="{ tableProps, onSelectionChange, onColumnLayoutChange }"
      ><DataTable
        v-bind="tableProps"
        :features="features"
        @update:column-layout="onColumnLayoutChange"
        @update:selected-ids="onSelectionChange" /></template
  ></KitShowcase>
</template>
