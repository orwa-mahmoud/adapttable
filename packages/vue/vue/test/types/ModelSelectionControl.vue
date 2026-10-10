<script setup lang="ts">
import {
  selectionCheckboxInputAttrs,
  type SelectionCheckboxProps,
} from "@adapttable/vue/adapter";
import { computed } from "vue";

import { ModelCheckbox } from "../fixtures/ModelCheckbox";
const props = defineProps<{ control: SelectionCheckboxProps }>();
const attrs = computed(() => selectionCheckboxInputAttrs(props.control.attrs));
</script>
<template>
  <ModelCheckbox
    v-bind="attrs"
    :model-value="control.checked"
    :indeterminate="control.indeterminate"
    @update:model-value="control.onToggle"
  />
</template>
