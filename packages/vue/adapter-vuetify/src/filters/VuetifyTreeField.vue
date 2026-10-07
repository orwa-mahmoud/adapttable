<script setup lang="ts">
import type {
  FilterTreeInputProps,
  FilterTreeSelectProps,
} from "@adapttable/vue/adapter";
import { useId } from "vue";

import VuetifyInput from "../controls/VuetifyInput.vue";
import VuetifySelect from "../controls/VuetifySelect.vue";

const props = defineProps<{
  readonly control: FilterTreeInputProps | FilterTreeSelectProps;
}>();
const id = useId();
</script>

<template>
  <div :class="control.fieldClassName" data-adapttable-part="filter-field">
    <label
      :for="id"
      :class="control.labelClassName"
      data-adapttable-part="filter-label"
      >{{ control.label }}</label
    >
    <VuetifySelect
      v-if="'options' in props.control"
      :value="control.value"
      :options="props.control.options"
      :on-change="control.onChange"
      :attrs="{
        id,
        'aria-label': control.label,
        class: control.className,
        'data-adapttable-part': props.control.part,
      }"
    />
    <VuetifyInput
      v-else
      :value="control.value"
      :type="props.control.type"
      :on-change="control.onChange"
      :attrs="{
        id,
        'aria-label': control.label,
        class: control.className,
        'data-adapttable-part': 'filter-input',
      }"
    />
  </div>
</template>
