<script setup lang="ts" generic="TRow">
import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  useColumnMenu,
} from "@adapttable/vue/adapter";

import { columnControls } from "./columnControls";

const props = defineProps<ColumnMenuSlotProps<TRow>>();
const model = useColumnMenu(() => props);
</script>

<template>
  <ColumnMenuChrome :model="model" :slots="columnControls" />
</template>
