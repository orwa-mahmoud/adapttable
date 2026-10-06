<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { VSelect } from "vuetify/components/VSelect";

import { controlAttrs, useControlRef } from "./controlRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
  }[];
  readonly onChange: (value: string) => void;
}>();
const select = shallowRef<InstanceType<typeof VSelect> | null>(null);
const attrs = computed(() => controlAttrs(props.attrs));
useControlRef(
  () => select.value?.controlRef,
  () => props.attrs
);
function change(value: unknown): void {
  if (typeof value === "string") props.onChange(value);
}
</script>

<template>
  <VSelect
    ref="select"
    v-bind="attrs"
    :model-value="value"
    :items="options"
    item-title="label"
    item-value="value"
    :item-props="(item) => ({ disabled: item.disabled })"
    density="compact"
    variant="outlined"
    hide-details
    class="adapttable-vuetify-select"
    @update:model-value="change"
  />
</template>
