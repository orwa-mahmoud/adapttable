<script setup lang="ts">
import { type DensityChooserSlots, toVueAttrs } from "@adapttable/vue/adapter";
import URadioGroup from "@nuxt/ui/components/RadioGroup.vue";
import { computed } from "vue";

import { useNuxtControlSize } from "../densityContext";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: Parameters<DensityChooserSlots["Control"]>[0];
}>();
const size = useNuxtControlSize();
const items = computed(() => [...props.control.options]);
function update(value: unknown): void {
  if (
    (value === "comfortable" || value === "compact") &&
    value !== props.control.value
  )
    props.control.onChange(value);
}
</script>

<template>
  <URadioGroup
    v-bind="toVueAttrs(control.attrs)"
    :items="items"
    :model-value="control.value"
    :size="size"
    orientation="horizontal"
    variant="table"
    indicator="hidden"
    :ui="{ item: 'min-h-11 items-center justify-center px-3 py-1.5' }"
    @update:model-value="update"
  />
</template>

<style>
@source inline("min-h-11 items-center justify-center px-3 py-1.5");
</style>
