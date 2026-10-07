<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, shallowRef } from "vue";
import { VTextarea } from "vuetify/components/VTextarea";
import { VTextField } from "vuetify/components/VTextField";

import { useControlRef, valueControlAttrs } from "./controlRef";

/** Vuetify owns its compound host; controlRef remains the native focus target. */
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly value: string;
  readonly type?: string;
  readonly multiline?: boolean;
  readonly onChange: (value: string) => void;
}>();
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const input = shallowRef<InstanceType<typeof VTextField> | null>(null);
const textarea = shallowRef<InstanceType<typeof VTextarea> | null>(null);
const attrs = computed(() => {
  const forwarded = valueControlAttrs(props.attrs);
  // VTextField copies its role prop to both VField and the native input.
  // A search input already has the searchbox role; keep that role native.
  if (
    !props.multiline &&
    props.type === "search" &&
    forwarded.role === "searchbox"
  )
    delete forwarded.role;
  return forwarded;
});
const invalid = computed(
  () =>
    props.attrs["aria-invalid"] === true ||
    props.attrs["aria-invalid"] === "true"
);
useControlRef(
  () =>
    props.multiline ? textarea.value?.controlRef : input.value?.controlRef,
  () => props.attrs
);
function change(value: unknown): void {
  const owner = props.multiline ? textarea.value : input.value;
  props.onChange(typeof value === "string" ? value : "");
  // Repaint a rejected native edit through Vue's public component API.
  void nextTick(() => {
    if (!active || owner !== (props.multiline ? textarea.value : input.value))
      return;
    const control = owner?.controlRef;
    if (!control?.isConnected) return;
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement) &&
      control.value !== props.value
    )
      owner?.$forceUpdate();
  });
}
</script>

<template>
  <VTextarea
    v-if="multiline"
    ref="textarea"
    v-bind="attrs"
    :model-value="value"
    :error="invalid"
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
    :error="invalid"
    variant="outlined"
    density="compact"
    hide-details
    class="adapttable-vuetify-field"
    @update:model-value="change"
  />
</template>
