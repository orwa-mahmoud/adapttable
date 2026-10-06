<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { VTextarea } from "vuetify/components/VTextarea";
import { VTextField } from "vuetify/components/VTextField";

import { controlAttrs, useControlRef } from "./controlRef";

/** Vuetify owns its compound host; controlRef remains the native focus target. */
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly value: string;
  readonly type?: string;
  readonly multiline?: boolean;
  readonly onChange: (value: string) => void;
}>();
const input = shallowRef<InstanceType<typeof VTextField> | null>(null);
const textarea = shallowRef<InstanceType<typeof VTextarea> | null>(null);
const attrs = computed(() => controlAttrs(props.attrs));
useControlRef(
  () =>
    props.multiline ? textarea.value?.controlRef : input.value?.controlRef,
  () => props.attrs
);
function change(value: unknown): void {
  props.onChange(typeof value === "string" ? value : "");
}
</script>

<template>
  <VTextarea
    v-if="multiline"
    ref="textarea"
    v-bind="attrs"
    :model-value="value"
    variant="outlined"
    density="compact"
    hide-details
    class="adapttable-vuetify-field"
    @update:model-value="change"
  />
  <VTextField
    v-else
    ref="input"
    v-bind="attrs"
    :type="type ?? 'text'"
    :model-value="value"
    variant="outlined"
    density="compact"
    hide-details
    class="adapttable-vuetify-field"
    @update:model-value="change"
  />
</template>
