<script setup lang="ts">
import type { SelectionCheckboxProps } from "@adapttable/vue/adapter";

const control = defineProps<SelectionCheckboxProps>();
const checked: number = control.checked;
control.onToggle(true);
</script>
<template>
  <span>{{ checked }}</span>
</template>
