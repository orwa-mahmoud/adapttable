<script setup lang="ts">
import type { FilterHeaderMultiProps } from "@adapttable/vue/adapter";
import { computed } from "vue";
import { VSelect } from "vuetify/components/VSelect";

const props = defineProps<{
  readonly control: FilterHeaderMultiProps;
  readonly dir?: "ltr" | "rtl";
}>();
const attrs = computed(() => ({
  dir: props.dir,
  "aria-label": props.control.label,
  "data-adapttable-part": "filter-header-input",
}));
const listAttrs = computed(() => ({
  "data-adapttable-part": "filter-header-menu",
  class: props.control.menuClassName,
  dir: props.dir,
}));
function change(value: unknown): void {
  if (!Array.isArray(value)) return;
  // VSelect without clear/chip deletion requests one option toggle per activation.
  const values: readonly unknown[] = value;
  const changed = props.control.options.find(
    (option) =>
      values.includes(option.value) !==
      props.control.selected.includes(option.value)
  );
  if (changed)
    props.control.onToggle(changed.value, values.includes(changed.value));
}
</script>

<template>
  <VSelect
    :model-value="control.selected"
    :items="control.options"
    item-title="label"
    item-value="value"
    :placeholder="control.summary"
    :class="control.className"
    v-bind="attrs"
    :list-props="listAttrs"
    multiple
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="change"
  >
    <template #selection="{ index }">
      <span v-if="index === 0">{{ control.summary }}</span>
    </template>
  </VSelect>
</template>
